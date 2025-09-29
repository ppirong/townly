'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { emailSchedules, userEmailSettings, emailSendLogs, individualEmailLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  createEmailScheduleSchema, 
  updateEmailScheduleSchema, 
  sendManualEmailSchema,
  CreateEmailScheduleInput,
  UpdateEmailScheduleInput,
  SendManualEmailInput
} from '@/lib/schemas/email';
import { WeatherAISummaryService } from '@/lib/services/weather-ai-summary';
import { gmailService } from '@/lib/services/gmail-service';
import { emailTemplateService } from '@/lib/services/email-template-service';
import { revalidatePath } from 'next/cache';

// 현재 날씨 데이터 가져오기를 위한 서비스 임포트
import { weatherDataCollectorService } from '@/lib/services/weather-data-collector';

/**
 * 이메일 스케줄 생성
 */
export async function createEmailSchedule(input: CreateEmailScheduleInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = createEmailScheduleSchema.parse(input);
  
  // 다음 발송 시간 계산
  const nextSendAt = calculateNextSendTime(validatedData.scheduleTime, validatedData.timezone);
  
  const result = await db.insert(emailSchedules).values({
    ...validatedData,
    nextSendAt,
    createdBy: userId,
    id: crypto.randomUUID(),
  });
  
  revalidatePath('/admin/email-schedules');
  return result;
}

/**
 * 이메일 스케줄 목록 조회
 */
export async function getEmailSchedules() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  return await db
    .select()
    .from(emailSchedules)
    .orderBy(emailSchedules.createdAt);
}

/**
 * 이메일 스케줄 업데이트
 */
export async function updateEmailSchedule(id: string, input: UpdateEmailScheduleInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = updateEmailScheduleSchema.parse(input);
  
  // 스케줄 시간이 변경된 경우 다음 발송 시간 재계산
  let updateData = validatedData;
  if (validatedData.scheduleTime) {
    const nextSendAt = calculateNextSendTime(
      validatedData.scheduleTime, 
      validatedData.timezone || 'Asia/Seoul'
    );
    updateData = { ...validatedData, nextSendAt };
  }
  
  const result = await db
    .update(emailSchedules)
    .set(updateData)
    .where(eq(emailSchedules.id, id));
    
  revalidatePath('/admin/email-schedules');
  return result;
}

/**
 * 이메일 스케줄 삭제
 */
export async function deleteEmailSchedule(id: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const result = await db
    .delete(emailSchedules)
    .where(eq(emailSchedules.id, id));
    
  revalidatePath('/admin/email-schedules');
  return result;
}

/**
 * 수동 이메일 발송
 */
export async function sendManualEmail(input: SendManualEmailInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = sendManualEmailSchema.parse(input);
  const startTime = Date.now();
  
  try {
    // 1. 날씨 데이터 수집
    const weatherData = await collectWeatherData(validatedData.location, validatedData.timeOfDay);
    
    // 2. AI 요약 생성
    const weatherAI = new WeatherAISummaryService();
    const weatherSummary = await weatherAI.generateWeatherSummary(
      {
        location: validatedData.location,
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12시간 후
        timeOfDay: validatedData.timeOfDay,
        currentMonth: new Date().getMonth() + 1,
        includeHourlyForecast: true,
        includeDailyForecast: true,
      },
      weatherData
    );
    
    // 3. 이메일 제목 생성
    const emailSubject = validatedData.subject || await weatherAI.generateEmailSubject(
      validatedData.location,
      validatedData.timeOfDay,
      weatherData
    );
    
    // 4. 발송 대상 결정
    let recipients: Array<{ clerkUserId: string; email: string; }> = [];
    
    if (validatedData.targetType === 'test' && validatedData.testEmail) {
      recipients = [{ clerkUserId: userId, email: validatedData.testEmail }];
    } else {
      recipients = await getEmailRecipients(validatedData.targetType, validatedData.targetUserIds);
    }
    
    if (recipients.length === 0) {
      throw new Error('발송 대상이 없습니다');
    }
    
    // 5. 이메일 발송 로그 생성
    const emailSendLogId = crypto.randomUUID();
    await db.insert(emailSendLogs).values({
      id: emailSendLogId,
      emailType: validatedData.targetType === 'test' ? 'test' : 'manual',
      subject: emailSubject,
      recipientCount: recipients.length,
      successCount: 0,
      failureCount: 0,
      weatherDataUsed: weatherData,
      aiSummary: weatherSummary.summary,
      forecastPeriod: weatherSummary.forecastPeriod,
      isSuccessful: false,
      initiatedBy: userId,
    });
    
    // 6. 이메일 발송
    const emailData = recipients.map(recipient => ({
      to: recipient.email,
      subject: emailSubject,
      htmlContent: emailTemplateService.generateWeatherEmailHTML({
        location: validatedData.location,
        timeOfDay: validatedData.timeOfDay,
        weatherSummary,
      }),
      textContent: emailTemplateService.generateWeatherEmailText({
        location: validatedData.location,
        timeOfDay: validatedData.timeOfDay,
        weatherSummary,
      }),
    }));
    
    const sendResult = await gmailService.sendBulkEmails(emailData);
    
    // 7. 발송 결과 업데이트
    await db
      .update(emailSendLogs)
      .set({
        successCount: sendResult.successCount,
        failureCount: sendResult.failureCount,
        isSuccessful: sendResult.failureCount === 0,
        executionTime: Date.now() - startTime,
        failedEmails: sendResult.results
          .filter(r => !r.success)
          .map(r => ({ email: r.email, error: r.error })),
      })
      .where(eq(emailSendLogs.id, emailSendLogId));
    
    // 8. 개별 이메일 로그 저장
    const individualLogs = sendResult.results.map(result => ({
      id: crypto.randomUUID(),
      emailSendLogId,
      clerkUserId: recipients.find(r => r.email === result.email)?.clerkUserId || '',
      recipientEmail: result.email,
      subject: emailSubject,
      status: result.success ? 'sent' : 'failed',
      sentAt: result.success ? new Date() : undefined,
      gmailMessageId: result.messageId,
      gmailThreadId: result.threadId,
      errorMessage: result.error,
    }));
    
    if (individualLogs.length > 0) {
      await db.insert(individualEmailLogs).values(individualLogs);
    }
    
    revalidatePath('/admin/email-schedules');
    
    return {
      success: true,
      totalSent: sendResult.totalCount,
      successCount: sendResult.successCount,
      failureCount: sendResult.failureCount,
      executionTime: Date.now() - startTime,
    };
    
  } catch (error) {
    console.error('Manual email send error:', error);
    
    // 에러 로그 업데이트
    try {
      await db
        .update(emailSendLogs)
        .set({
          isSuccessful: false,
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
          executionTime: Date.now() - startTime,
        })
        .where(eq(emailSendLogs.id, crypto.randomUUID()));
    } catch (dbError) {
      console.error('Failed to update error log:', dbError);
    }
    
    throw error;
  }
}

/**
 * 스케줄된 이메일 발송 (크론 작업용)
 */
export async function executeScheduledEmail(scheduleId: string) {
  try {
    // 스케줄 정보 조회
    const schedule = await db
      .select()
      .from(emailSchedules)
      .where(and(
        eq(emailSchedules.id, scheduleId),
        eq(emailSchedules.isActive, true)
      ));
    
    if (schedule.length === 0) {
      throw new Error('활성화된 스케줄을 찾을 수 없습니다');
    }
    
    const scheduleData = schedule[0];
    
    // 수동 발송과 동일한 로직 실행
    const result = await sendManualEmail({
      subject: scheduleData.emailSubject,
      location: '서울', // 기본 위치 (향후 사용자별 위치 설정 추가 가능)
      timeOfDay: scheduleData.scheduleTime.startsWith('06') ? 'morning' : 'evening',
      targetType: scheduleData.targetType as any,
      targetUserIds: scheduleData.targetUserIds as string[] | undefined,
      forceRefreshWeather: true,
    });
    
    // 스케줄 정보 업데이트
    const nextSendAt = calculateNextSendTime(scheduleData.scheduleTime, scheduleData.timezone);
    await db
      .update(emailSchedules)
      .set({
        lastSentAt: new Date(),
        nextSendAt,
        totalSentCount: scheduleData.totalSentCount + 1,
      })
      .where(eq(emailSchedules.id, scheduleId));
    
    return result;
    
  } catch (error) {
    console.error('Scheduled email execution error:', error);
    throw error;
  }
}

/**
 * 날씨 데이터 수집
 */
async function collectWeatherData(location: string, timeOfDay: 'morning' | 'evening') {
  const now = new Date();
  const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12시간 후
  
  try {
    // 시간별 예보 데이터 (12시간)
    const hourlyData = await weatherDataCollectorService.getHourlyForecast(location, 12);
    
    // 일별 예보 데이터 (5일)
    const dailyData = await weatherDataCollectorService.getDailyForecast(location, 5);
    
    return {
      hourlyForecasts: hourlyData.map(hour => ({
        dateTime: new Date(hour.forecastDateTime),
        temperature: hour.temperature,
        conditions: hour.conditions,
        precipitationProbability: hour.precipitationProbability || 0,
        rainProbability: hour.rainProbability || 0,
        windSpeed: hour.windSpeed || 0,
        humidity: hour.humidity || 0,
      })),
      dailyForecasts: dailyData.map(day => ({
        date: day.forecastDate,
        dayOfWeek: day.dayOfWeek,
        highTemp: day.highTemp,
        lowTemp: day.lowTemp,
        conditions: day.conditions,
        precipitationProbability: day.precipitationProbability || 0,
        rainProbability: day.rainProbability || 0,
      })),
    };
  } catch (error) {
    console.error('Weather data collection error:', error);
    // 기본 날씨 데이터 반환
    return {
      hourlyForecasts: [],
      dailyForecasts: [],
    };
  }
}

/**
 * 이메일 수신자 목록 조회
 */
async function getEmailRecipients(
  targetType: 'all_users' | 'active_users' | 'specific_users',
  targetUserIds?: string[]
) {
  switch (targetType) {
    case 'specific_users':
      if (!targetUserIds || targetUserIds.length === 0) {
        return [];
      }
      
      return await db
        .select({
          clerkUserId: userEmailSettings.clerkUserId,
          email: userEmailSettings.email,
        })
        .from(userEmailSettings)
        .where(and(
          eq(userEmailSettings.isSubscribed, true),
          eq(userEmailSettings.receiveWeatherEmails, true)
        ));
      
    case 'active_users':
    case 'all_users':
    default:
      return await db
        .select({
          clerkUserId: userEmailSettings.clerkUserId,
          email: userEmailSettings.email,
        })
        .from(userEmailSettings)
        .where(and(
          eq(userEmailSettings.isSubscribed, true),
          eq(userEmailSettings.receiveWeatherEmails, true)
        ));
  }
}

/**
 * 다음 발송 시간 계산
 */
function calculateNextSendTime(scheduleTime: string, timezone: string = 'Asia/Seoul'): Date {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  
  const nextSend = new Date(now);
  nextSend.setHours(hours, minutes, 0, 0);
  
  // 오늘 발송 시간이 이미 지났으면 내일로 설정
  if (nextSend <= now) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  
  return nextSend;
}
