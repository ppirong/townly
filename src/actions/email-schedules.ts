'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { emailSchedules, emailSendLogs, individualEmailLogs } from '@/db/schema';
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
import { createClerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

// 사용자별 날씨 데이터 수집을 위한 함수 임포트
import { getUserHourlyWeather, getUserDailyWeather } from '@/lib/services/user-weather-collector';

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
  
  const schedules = await db
    .select()
    .from(emailSchedules)
    .orderBy(emailSchedules.createdAt);
  
  // 데이터베이스 결과를 plain object로 변환하여 직렬화 가능하게 만듦
  return schedules.map(schedule => ({
    id: schedule.id,
    title: schedule.title,
    description: schedule.description,
    emailSubject: schedule.emailSubject,
    emailTemplate: schedule.emailTemplate,
    scheduleTime: schedule.scheduleTime,
    timezone: schedule.timezone,
    targetType: schedule.targetType,
    targetUserIds: schedule.targetUserIds,
    isActive: schedule.isActive,
    lastSentAt: schedule.lastSentAt,
    nextSendAt: schedule.nextSendAt,
    totalSentCount: schedule.totalSentCount,
    createdBy: schedule.createdBy,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  }));
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
export async function sendManualEmail(input: SendManualEmailInput, testUserId?: string) {
  const { userId: clerkUserId } = await auth();
  const userId = clerkUserId || testUserId;
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = sendManualEmailSchema.parse(input);
  const startTime = Date.now();
  
  try {
    // 1. 발송 대상 결정 (먼저 결정하여 개인화 처리)
    let recipients: Array<{ clerkUserId: string; email: string; }> = [];
    
    if (validatedData.targetType === 'test' && validatedData.testEmail) {
      recipients = [{ clerkUserId: userId, email: validatedData.testEmail }];
    } else if (validatedData.targetType !== 'test') {
      recipients = await getEmailRecipients(validatedData.targetType, validatedData.targetUserIds);
    }
    
    if (recipients.length === 0) {
      throw new Error('발송 대상이 없습니다');
    }

    console.log(`📧 개인화된 이메일 발송 시작: ${recipients.length}명`);
    
    // 2. 각 사용자별로 개인화된 이메일 생성
    const personalizedEmails = await Promise.all(
      recipients.map(async (recipient, index) => {
        try {
          console.log(`🔄 사용자 ${index + 1}/${recipients.length} 개인화 처리 중...`);
          
          // 2-1. 사용자별 날씨 데이터 수집
          const userWeatherData = await collectUserWeatherData(
            recipient.clerkUserId,
            validatedData.location,
            validatedData.timeOfDay
          );
          
          // 2-2. 사용자별 AI 요약 생성
          const weatherAI = new WeatherAISummaryService();
          const personalizedSummary = await weatherAI.generatePersonalizedWeatherSummary(
            {
              clerkUserId: recipient.clerkUserId,
              location: validatedData.location,
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
              timeOfDay: validatedData.timeOfDay,
              currentMonth: new Date().getMonth() + 1,
              includeHourlyForecast: true,
              includeDailyForecast: true,
            },
            userWeatherData
          );
          
          // 2-3. 개인화된 이메일 제목 생성
          const personalizedSubject = validatedData.subject || await weatherAI.generatePersonalizedEmailSubject(
            validatedData.location,
            validatedData.timeOfDay,
            userWeatherData.hourlyForecasts,
            recipient.clerkUserId
          );
          
          console.log(`✅ 사용자 ${recipient.clerkUserId.slice(0, 8)} 개인화 완료`);
          
          return {
            recipient,
            weatherData: userWeatherData,
            summary: personalizedSummary,
            subject: personalizedSubject,
            emailData: {
              to: recipient.email,
              subject: personalizedSubject,
              htmlContent: emailTemplateService.generateWeatherEmailHTML({
                location: validatedData.location,
                timeOfDay: validatedData.timeOfDay,
                weatherSummary: personalizedSummary,
                clerkUserId: recipient.clerkUserId,
              }),
              textContent: emailTemplateService.generateWeatherEmailText({
                location: validatedData.location,
                timeOfDay: validatedData.timeOfDay,
                weatherSummary: personalizedSummary,
                clerkUserId: recipient.clerkUserId,
              }),
            }
          };
          
        } catch (userError) {
          console.error(`❌ 사용자 ${recipient.clerkUserId.slice(0, 8)} 개인화 실패:`, userError);
          
          // 개인화 실패 시 일반 날씨 데이터로 폴백
          const fallbackWeatherData = await collectWeatherData(validatedData.location, validatedData.timeOfDay);
          const weatherAI = new WeatherAISummaryService();
          const fallbackSummary = await weatherAI.generateWeatherSummary(
            {
              location: validatedData.location,
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
              timeOfDay: validatedData.timeOfDay,
              currentMonth: new Date().getMonth() + 1,
              includeHourlyForecast: true,
              includeDailyForecast: true,
            },
            fallbackWeatherData
          );
          
          const fallbackSubject = validatedData.subject || await weatherAI.generateEmailSubject(
            validatedData.location,
            validatedData.timeOfDay,
            fallbackWeatherData
          );
          
          return {
            recipient,
            weatherData: fallbackWeatherData,
            summary: fallbackSummary,
            subject: fallbackSubject,
            emailData: {
              to: recipient.email,
              subject: `[일반] ${fallbackSubject}`,
              htmlContent: emailTemplateService.generateWeatherEmailHTML({
                location: validatedData.location,
                timeOfDay: validatedData.timeOfDay,
                weatherSummary: fallbackSummary,
              }),
              textContent: emailTemplateService.generateWeatherEmailText({
                location: validatedData.location,
                timeOfDay: validatedData.timeOfDay,
                weatherSummary: fallbackSummary,
              }),
            }
          };
        }
      })
    );

    // 3. 이메일 발송 로그 생성 (집계된 정보로)
    const emailSendLogId = crypto.randomUUID();
    const aggregatedSummary = personalizedEmails.length > 0 ? personalizedEmails[0].summary : null;
    
    await db.insert(emailSendLogs).values({
      id: emailSendLogId,
      emailType: validatedData.targetType === 'test' ? 'test' : 'manual_personalized',
      subject: personalizedEmails.length > 0 ? personalizedEmails[0].subject : '개인화 이메일',
      recipientCount: recipients.length,
      successCount: 0,
      failureCount: 0,
      weatherDataUsed: personalizedEmails.length > 0 ? personalizedEmails[0].weatherData : null,
      aiSummary: aggregatedSummary?.summary || '개인화된 요약',
      forecastPeriod: aggregatedSummary?.forecastPeriod || '12시간',
      isSuccessful: false,
      initiatedBy: userId,
    });
    
    // 4. 개인화된 이메일 발송
    const emailDataArray = personalizedEmails.map(item => item.emailData);
    const sendResult = await gmailService.sendBulkEmails(emailDataArray);
    
    // 5. 발송 결과 업데이트
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
    
    // 6. 개별 이메일 로그 저장 (개인화 정보 포함)
    const individualLogs = sendResult.results.map((result, index) => {
      const personalizedData = personalizedEmails[index];
      return {
        id: crypto.randomUUID(),
        emailSendLogId,
        clerkUserId: personalizedData?.recipient.clerkUserId || '',
        recipientEmail: result.email,
        subject: personalizedData?.subject || '개인화 이메일',
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
        errorMessage: result.error,
      };
    });
    
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
    
    // 사용자 위치 정보 조회 (기본값으로 서울 사용)
    let userLocationName = '서울';
    try {
      const { getUserLocation } = await import('./location');
      const locationResult = await getUserLocation();
      
      if (locationResult.success && locationResult.data) {
        // 사용자가 설정한 실제 위치 사용 (address 우선, 없으면 locationName 사용)
        userLocationName = locationResult.data.address || locationResult.data.locationName || '서울';
        console.log(`📍 스케줄 이메일에 사용자 위치 적용: ${userLocationName}`);
      }
    } catch (error) {
      console.warn('⚠️ 사용자 위치 조회 실패, 기본값(서울) 사용:', error);
    }

    // 개인화된 수동 발송과 동일한 로직 실행
    const result = await sendManualEmail({
      subject: scheduleData.emailSubject,
      location: userLocationName, // 사용자 설정 위치 또는 기본값
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
 * 사용자별 날씨 데이터 수집 (개인화된 이메일용)
 */
async function collectUserWeatherData(
  clerkUserId: string,
  location: string,
  timeOfDay: 'morning' | 'evening'
) {
  try {
    console.log(`🌤️ 사용자 ${clerkUserId.slice(0, 8)} 개인화 날씨 데이터 수집 시작`);
    
    // 사용자별 시간별 날씨 데이터 조회 (12시간)
    const hourlyData = await getUserHourlyWeather(
      clerkUserId,
      location,
      12
    );
    
    // 사용자별 일별 날씨 데이터 조회 (5일)
    const dailyData = await getUserDailyWeather(
      clerkUserId,
      location,
      5
    );
    
    console.log(`✅ 사용자 ${clerkUserId.slice(0, 8)} 날씨 데이터 수집 완료: 시간별 ${hourlyData.length}개, 일별 ${dailyData.length}개`);
    
    return {
      hourlyForecasts: hourlyData,
      dailyForecasts: dailyData,
    };
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId.slice(0, 8)} 날씨 데이터 수집 실패:`, error);
    
    // 실패 시 일반 날씨 데이터로 폴백
    console.log(`🔄 사용자 ${clerkUserId.slice(0, 8)} 일반 날씨 데이터로 폴백`);
    const fallbackData = await collectWeatherData(location, timeOfDay);
    
    // 일반 데이터를 사용자 데이터 형식으로 변환
    return {
      hourlyForecasts: fallbackData.hourlyForecasts.map(h => ({
        dateTime: h.dateTime,
        temperature: h.temperature,
        conditions: h.conditions,
        precipitationProbability: h.precipitationProbability,
        rainProbability: h.rainProbability,
        windSpeed: h.windSpeed,
        humidity: h.humidity,
        source: 'real_time_api' as const
      })),
      dailyForecasts: fallbackData.dailyForecasts.map(d => ({
        date: d.date,
        dayOfWeek: d.dayOfWeek,
        highTemp: d.highTemp,
        lowTemp: d.lowTemp,
        conditions: d.conditions,
        precipitationProbability: d.precipitationProbability,
        rainProbability: d.rainProbability,
        source: 'real_time_api' as const
      }))
    };
  }
}

/**
 * 날씨 데이터 수집 (일반 이메일용 - 폴백 목적)
 */
async function collectWeatherData(location: string, timeOfDay: 'morning' | 'evening') {
  const now = new Date();
  const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12시간 후
  
  try {
    // 기존 weatherDataCollectorService 사용 (폴백을 위해 유지)
    const { weatherDataCollectorService } = await import('@/lib/services/weather-data-collector');
    
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
 * 이메일 수신자 목록 조회 (Clerk 기반)
 */
async function getEmailRecipients(
  targetType: 'all_users' | 'active_users' | 'specific_users',
  targetUserIds?: string[]
) {
  try {
    console.log(`📋 Clerk 기반 이메일 수신자 조회: ${targetType}, 대상 ID: ${targetUserIds?.join(', ') || 'none'}`);
    
    // Clerk 클라이언트 생성
    const clerkClient = createClerkClient({ 
      secretKey: env.CLERK_SECRET_KEY 
    });
    
    switch (targetType) {
      case 'specific_users':
        if (!targetUserIds || targetUserIds.length === 0) {
          console.log('❌ 특정 사용자 타겟이지만 대상 ID가 없음');
          return [];
        }
        
        // 특정 사용자들만 조회
        const specificUsers = await Promise.all(
          targetUserIds.map(async (userId) => {
            try {
              const user = await clerkClient.users.getUser(userId);
              const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
              
              if (primaryEmail) {
                return {
                  clerkUserId: user.id,
                  email: primaryEmail.emailAddress,
                };
              }
              return null;
            } catch (error) {
              console.warn(`⚠️ 사용자 ${userId} 조회 실패:`, error);
              return null;
            }
          })
        );
        
        const validSpecificUsers = specificUsers.filter(user => user !== null);
        console.log(`✅ 특정 사용자 ${validSpecificUsers.length}명 조회됨`);
        return validSpecificUsers;
        
      case 'active_users':
      case 'all_users':
      default:
        // Clerk에서 모든 사용자 조회
        console.log('🔍 Clerk에서 모든 사용자 조회 중...');
        const response = await clerkClient.users.getUserList({
          limit: 500, // 최대 500명까지 조회
        });
        
        const allUsers = response.data || [];
        console.log(`📊 Clerk 전체 사용자 수: ${allUsers.length}명`);
        
        // 유효한 이메일 주소가 있는 사용자만 필터링
        const eligibleRecipients = allUsers
          .map(user => {
            const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
            
            if (primaryEmail && primaryEmail.verification?.status === 'verified') {
              return {
                clerkUserId: user.id,
                email: primaryEmail.emailAddress,
              };
            }
            return null;
          })
          .filter(user => user !== null);
        
        console.log(`✅ 이메일 발송 가능한 사용자: ${eligibleRecipients.length}명`);
        
        // 사용자 목록 로깅 (개발/디버깅용)
        eligibleRecipients.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.clerkUserId.slice(0, 8)}...)`);
        });
        
        return eligibleRecipients;
    }
  } catch (error) {
    console.error('❌ Clerk 기반 이메일 수신자 조회 실패:', error);
    return [];
  }
}

/**
 * 다음 발송 시간 계산 (KST → UTC 변환)
 */
function calculateNextSendTime(scheduleTime: string, timezone: string = 'Asia/Seoul'): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  
  // 현재 한국시간 기준으로 다음 발송 시간 계산
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC → KST 변환
  
  // 한국시간 기준으로 다음 발송 시간 설정
  const kstNextSend = new Date(kstNow);
  kstNextSend.setHours(hours, minutes, 0, 0);
  
  // 오늘 발송 시간이 이미 지났으면 내일로 설정
  if (kstNextSend <= kstNow) {
    kstNextSend.setDate(kstNextSend.getDate() + 1);
  }
  
  // KST → UTC 변환하여 반환 (데이터베이스에는 UTC로 저장)
  const utcNextSend = new Date(kstNextSend.getTime() - (9 * 60 * 60 * 1000));
  
  console.log(`📅 스케줄 시간 계산:`);
  console.log(`   입력된 시간: ${scheduleTime} (KST)`);
  console.log(`   KST 다음 발송: ${kstNextSend.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`   UTC 저장 시간: ${utcNextSend.toISOString()}`);
  
  return utcNextSend;
}
