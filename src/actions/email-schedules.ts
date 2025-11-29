'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { emailSchedules, emailSendLogs, individualEmailLogs, userLocations } from '@/db/schema';
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

// 날씨 안내 이메일 작성 에이전트 임포트
import { WeatherEmailAgent } from '@/lib/services/weather-email-agent';
import { WeatherEmailDataPreparer } from '@/lib/services/weather-email-data-preparer';

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
 * 모든 활성 스케줄의 nextSendAt 시간 재계산 (관리자용)
 */
export async function recalculateAllScheduleTimes() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    console.log('🔄 모든 스케줄의 nextSendAt 시간 재계산 시작');
    
    // 모든 활성 스케줄 조회
    const activeSchedules = await db
      .select()
      .from(emailSchedules)
      .where(eq(emailSchedules.isActive, true));
    
    console.log(`📋 재계산 대상 스케줄: ${activeSchedules.length}개`);
    
    let updatedCount = 0;
    
    // 각 스케줄의 nextSendAt 재계산
    for (const schedule of activeSchedules) {
      try {
        const newNextSendAt = calculateNextSendTime(schedule.scheduleTime, schedule.timezone);
        
        await db
          .update(emailSchedules)
          .set({
            nextSendAt: newNextSendAt,
            updatedAt: new Date(),
          })
          .where(eq(emailSchedules.id, schedule.id));

        console.log(`✅ ${schedule.title}: ${schedule.scheduleTime} → ${newNextSendAt.toISOString()}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ 스케줄 ${schedule.title} 재계산 실패:`, error);
      }
    }
    
    console.log(`🎉 스케줄 시간 재계산 완료: ${updatedCount}/${activeSchedules.length}개 성공`);
    
    revalidatePath('/admin/email-schedules');
    
    return {
      success: true,
      totalSchedules: activeSchedules.length,
      updatedCount,
      message: `${updatedCount}개 스케줄의 발송 시간이 재계산되었습니다.`
    };
    
  } catch (error) {
    console.error('스케줄 시간 재계산 실패:', error);
    throw new Error('스케줄 시간 재계산에 실패했습니다.');
  }
}

/**
 * 크론잡 전용 이메일 발송 (인증 없이)
 */
export async function sendScheduledEmailWithoutAuth(input: SendManualEmailInput & { scheduleId?: string }) {
  const startTime = Date.now();
  
  try {
    const validatedData = sendManualEmailSchema.parse(input);
    
    // 1. 발송 대상 결정 (크론잡에서는 인증 없이 모든 사용자 대상)
    let recipients: Array<{ clerkUserId: string; email: string; }> = [];
    
    if (validatedData.targetType !== 'test') {
      recipients = await getEmailRecipientsWithoutAuth(validatedData.targetType, validatedData.targetUserIds);
    }
    
    if (recipients.length === 0) {
      throw new Error('발송 대상이 없습니다');
    }

    // useAgent 옵션 확인
    const useAgent = validatedData.useAgent === true;
    
    if (useAgent) {
      console.log(`🤖 크론잡 에이전트 기반 이메일 발송 시작: ${recipients.length}명`);
    } else {
      console.log(`📧 크론잡 템플릿 기반 이메일 발송 시작: ${recipients.length}명`);
    }
    
    // 2. 각 사용자별로 개인화된 이메일 생성
    const personalizedEmails = await Promise.all(
      recipients.map(async (recipient, index) => {
        try {
          console.log(`🔄 사용자 ${index + 1}/${recipients.length} 개인화 처리 중...`);
          
          if (useAgent) {
            // 🤖 에이전트 방식: WeatherEmailAgent 사용
            const sendTime = validatedData.timeOfDay === 'morning' ? 6 : 18;
            
            // 사용자별 날씨 데이터 준비
            const dataPreparer = new WeatherEmailDataPreparer();
            const weatherData = await dataPreparer.prepareUserWeatherData(
              recipient.clerkUserId,
              sendTime as 6 | 18
            );
            
            if (!weatherData) {
              throw new Error('날씨 데이터를 준비할 수 없습니다');
            }
            
            weatherData.userEmail = recipient.email;
            
            // 에이전트로 이메일 생성
            const agent = new WeatherEmailAgent({
              maxIterations: 5,
              minApprovalScore: 80,
            });
            
            const agentResult = await agent.generateEmail(weatherData);
            
            console.log(`✅ 사용자 ${recipient.clerkUserId.slice(0, 8)} 에이전트 처리 완료 (점수: ${agentResult.finalScore}/100, 순환: ${agentResult.iterations}회)`);
            
            // 이메일 제목 생성
            const emailSubject = validatedData.subject || `[Townly 날씨 안내] ${weatherData.sendDate} ${sendTime}시 날씨`;
            
            // 텍스트를 HTML로 변환
            const htmlContent = convertTextToHTML(agentResult.finalEmail);
            
            return {
              recipient,
              weatherData: null,
              summary: null,
              subject: emailSubject,
              agentResult,
              emailData: {
                to: recipient.email,
                subject: emailSubject,
                htmlContent,
                textContent: agentResult.finalEmail,
              }
            };
            
          } else {
            // 📧 템플릿 방식: WeatherAISummaryService 사용
            
            // 2-1. 사용자별 날씨 데이터 수집
            const userWeatherData = await collectUserWeatherData(
              recipient.clerkUserId,
              validatedData.location,
              validatedData.timeOfDay
            );
            
            // 2-2. 사용자 주소 조회
            const userAddress = await getUserAddressForEmail(recipient.clerkUserId, validatedData.location);
            
            // 2-3. 템플릿 기반 이메일 생성
            const weatherAI = new WeatherAISummaryService();
            const weatherDataInput = {
              hourlyForecasts: userWeatherData.hourlyForecasts.map(h => ({
                dateTime: h.dateTime,
                temperature: h.temperature,
                conditions: h.conditions,
                precipitationProbability: h.precipitationProbability,
                rainProbability: h.rainProbability,
                windSpeed: h.windSpeed,
                humidity: h.humidity,
              })),
              dailyForecasts: userWeatherData.dailyForecasts.map(d => ({
                date: d.date,
                dayOfWeek: d.dayOfWeek,
                highTemp: d.highTemp,
                lowTemp: d.lowTemp,
                conditions: d.conditions,
                precipitationProbability: d.precipitationProbability,
                rainProbability: d.rainProbability,
              }))
            };
            
            const personalizedSummary = await weatherAI.generateWeatherEmailByTemplate(
              {
                location: validatedData.location,
                startDateTime: new Date(),
                endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
                timeOfDay: validatedData.timeOfDay,
                currentMonth: new Date().getMonth() + 1,
                includeHourlyForecast: true,
                includeDailyForecast: true,
              },
              weatherDataInput,
              userAddress
            );
            
            // 2-4. 개인화된 이메일 제목 생성
            const personalizedSubject = validatedData.subject || weatherAI.generateEmailSubjectByTemplate(
              new Date(),
              new Date(Date.now() + 12 * 60 * 60 * 1000)
            );
            
            console.log(`✅ 사용자 ${recipient.clerkUserId.slice(0, 8)} 템플릿 처리 완료`);
            
            return {
              recipient,
              weatherData: userWeatherData,
              summary: personalizedSummary,
              subject: personalizedSubject,
              agentResult: null,
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
          }
          
        } catch (userError) {
          console.error(`❌ 사용자 ${recipient.clerkUserId.slice(0, 8)} 개인화 실패:`, userError);
          
          if (useAgent) {
            // 에이전트 실패 시 폴백 메시지
            const fallbackMessage = `[자동 생성 실패]\n\n죄송합니다. 현재 날씨 정보를 생성하는 중 오류가 발생했습니다.\n직접 날씨 페이지를 확인해주세요: https://townly.vercel.app/weather`;
            
            return {
              recipient,
              weatherData: null,
              summary: null,
              subject: `[Townly] 날씨 안내 생성 오류`,
              agentResult: null,
              emailData: {
                to: recipient.email,
                subject: `[Townly] 날씨 안내 생성 오류`,
                htmlContent: convertTextToHTML(fallbackMessage),
                textContent: fallbackMessage,
              }
            };
          } else {
            // 템플릿 방식 실패 시 일반 날씨 데이터로 폴백
            const fallbackWeatherData = await collectWeatherData(validatedData.location, validatedData.timeOfDay);
            const userAddress = validatedData.location; // 폴백 시 기본 위치 사용
            const weatherAI = new WeatherAISummaryService();
            const fallbackSummary = await weatherAI.generateWeatherEmailByTemplate(
              {
                location: validatedData.location,
                startDateTime: new Date(),
                endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
                timeOfDay: validatedData.timeOfDay,
                currentMonth: new Date().getMonth() + 1,
                includeHourlyForecast: true,
                includeDailyForecast: true,
              },
              fallbackWeatherData,
              userAddress
            );
            
            const fallbackSubject = validatedData.subject || weatherAI.generateEmailSubjectByTemplate(
              new Date(),
              new Date(Date.now() + 12 * 60 * 60 * 1000)
            );
            
            return {
              recipient,
              weatherData: fallbackWeatherData,
              summary: fallbackSummary,
              subject: fallbackSubject,
              agentResult: null,
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
        }
      })
    );

    // 3. 이메일 발송 로그 생성 (집계된 정보로)
    const emailSendLogId = crypto.randomUUID();
    const aggregatedSummary = personalizedEmails.length > 0 ? personalizedEmails[0].summary : null;
    
    await db.insert(emailSendLogs).values({
      id: emailSendLogId,
      emailScheduleId: input.scheduleId || null,
      emailType: 'scheduled_personalized',
      subject: personalizedEmails.length > 0 ? personalizedEmails[0].subject : '크론잡 개인화 이메일',
      recipientCount: recipients.length,
      successCount: 0,
      failureCount: 0,
      weatherDataUsed: personalizedEmails.length > 0 ? personalizedEmails[0].weatherData : null,
      aiSummary: aggregatedSummary?.summary || '크론잡 개인화된 요약',
      forecastPeriod: aggregatedSummary?.forecastPeriod || '12시간',
      isSuccessful: false,
      initiatedBy: 'cron_job',
      status: 'sent',
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
        sendLogId: emailSendLogId,
        clerkUserId: personalizedData?.recipient.clerkUserId || '',
        email: result.email,
        emailType: 'scheduled_personalized',
        templateUsed: 'weather_summary',
        personalizedContent: personalizedData ? {
          weatherData: personalizedData.weatherData,
          summary: personalizedData.summary,
          recipient: personalizedData.recipient
        } : null,
        status: result.success ? 'sent' : 'failed',
        errorDetails: result.error,
      };
    });
    
    if (individualLogs.length > 0) {
      await db.insert(individualEmailLogs).values(individualLogs);
    }
    
    return {
      success: true,
      totalSent: sendResult.totalCount,
      successCount: sendResult.successCount,
      failureCount: sendResult.failureCount,
      executionTime: Date.now() - startTime,
    };
    
  } catch (error) {
    console.error('Scheduled email send error:', error);
    throw error;
  }
}

/**
 * 에이전트를 사용한 수동 이메일 발송 (새로운 방식)
 */
export async function sendManualEmailWithAgent(input: SendManualEmailInput, testUserId?: string) {
  const { userId: clerkUserId } = await auth();
  const userId = clerkUserId || testUserId;
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = sendManualEmailSchema.parse(input);
  const startTime = Date.now();
  
  try {
    // 1. 발송 대상 결정
    let recipients: Array<{ clerkUserId: string; email: string; }> = [];
    
    if (validatedData.targetType === 'test' && validatedData.testEmail) {
      recipients = [{ clerkUserId: userId, email: validatedData.testEmail }];
    } else if (validatedData.targetType !== 'test') {
      recipients = await getEmailRecipients(validatedData.targetType, validatedData.targetUserIds);
    }
    
    if (recipients.length === 0) {
      throw new Error('발송 대상이 없습니다');
    }

    console.log(`🤖 에이전트 기반 이메일 발송 시작: ${recipients.length}명`);
    
    // 2. 발송 시간 결정 (6시 또는 18시)
    const sendTime = validatedData.timeOfDay === 'morning' ? 6 : 18;
    
    // 3. 각 사용자별로 에이전트 처리
    const agent = new WeatherEmailAgent({
      maxIterations: 5,
      minApprovalScore: 80,
    });
    
    const dataPreparer = new WeatherEmailDataPreparer();
    
    const personalizedEmails = await Promise.all(
      recipients.map(async (recipient, index) => {
        try {
          console.log(`🤖 사용자 ${index + 1}/${recipients.length} 에이전트 처리 중...`);
          
          // 3-1. 사용자별 날씨 데이터 준비
          const weatherData = await dataPreparer.prepareUserWeatherData(
            recipient.clerkUserId,
            sendTime as 6 | 18
          );
          
          if (!weatherData) {
            throw new Error('날씨 데이터를 준비할 수 없습니다');
          }
          
          weatherData.userEmail = recipient.email;
          
          // 3-2. 에이전트로 이메일 생성
          const agentResult = await agent.generateEmail(weatherData);
          
          console.log(`✅ 사용자 ${recipient.clerkUserId.slice(0, 8)} 에이전트 처리 완료 (점수: ${agentResult.finalScore}/100, 순환: ${agentResult.iterations}회)`);
          
          // 3-3. 이메일 제목 생성
          const emailSubject = validatedData.subject || `[Townly 날씨 안내] ${weatherData.sendDate} ${sendTime}시 날씨`;
          
          // 3-4. 텍스트를 HTML로 변환 (간단한 포맷팅)
          const htmlContent = convertTextToHTML(agentResult.finalEmail);
          
          return {
            recipient,
            agentResult,
            weatherData,
            emailData: {
              to: recipient.email,
              subject: emailSubject,
              htmlContent,
              textContent: agentResult.finalEmail,
            }
          };
          
        } catch (userError) {
          console.error(`❌ 사용자 ${recipient.clerkUserId.slice(0, 8)} 에이전트 처리 실패:`, userError);
          
          // 에이전트 실패 시 기본 메시지 반환
          const fallbackMessage = `[자동 생성 실패]\n\n죄송합니다. 현재 날씨 정보를 생성하는 중 오류가 발생했습니다.\n직접 날씨 페이지를 확인해주세요: https://townly.vercel.app/weather`;
          
          return {
            recipient,
            agentResult: null,
            weatherData: null,
            emailData: {
              to: recipient.email,
              subject: `[Townly] 날씨 안내 생성 오류`,
              htmlContent: convertTextToHTML(fallbackMessage),
              textContent: fallbackMessage,
            }
          };
        }
      })
    );

    // 4. 이메일 발송 로그 생성
    const emailSendLogId = crypto.randomUUID();
    
    await db.insert(emailSendLogs).values({
      id: emailSendLogId,
      emailScheduleId: null, // 수동 발송이므로 스케줄 ID 없음
      emailType: validatedData.targetType === 'test' ? 'test' : 'manual_agent',
      subject: validatedData.subject || '에이전트 생성 이메일',
      recipientCount: recipients.length,
      successCount: 0,
      failureCount: 0,
      weatherDataUsed: null,
      aiSummary: '에이전트 생성 요약',
      forecastPeriod: sendTime === 6 ? '6시-18시' : '18시-다음날 6시',
      isSuccessful: false,
      initiatedBy: userId,
      status: 'sent',
    });
    
    // 5. 이메일 발송
    const emailDataArray = personalizedEmails.map(item => item.emailData);
    const sendResult = await gmailService.sendBulkEmails(emailDataArray);
    
    // 6. 발송 결과 업데이트
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
    
    // 7. 개별 이메일 로그 저장
    const individualLogs = sendResult.results.map((result, index) => {
      const personalizedData = personalizedEmails[index];
      return {
        id: crypto.randomUUID(),
        sendLogId: emailSendLogId,
        clerkUserId: personalizedData?.recipient.clerkUserId || '',
        email: result.email,
        emailType: 'manual_agent',
        templateUsed: 'weather_agent',
        personalizedContent: personalizedData ? {
          weatherData: personalizedData.weatherData,
          agentResult: personalizedData.agentResult,
          recipient: personalizedData.recipient
        } : null,
        status: result.success ? 'sent' : 'failed',
        errorDetails: result.error,
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
      agentStats: {
        averageScore: personalizedEmails.reduce((sum, p) => sum + (p.agentResult?.finalScore || 0), 0) / personalizedEmails.length,
        averageIterations: personalizedEmails.reduce((sum, p) => sum + (p.agentResult?.iterations || 0), 0) / personalizedEmails.length,
      }
    };
    
  } catch (error) {
    console.error('에이전트 이메일 발송 중 오류:', error);
    throw error;
  }
}

/**
 * 수동 이메일 발송 (기존 템플릿 방식)
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
          
          // 2-2. 사용자 주소 조회
          const userAddress = await getUserAddressForEmail(recipient.clerkUserId, validatedData.location);
          
          // 2-3. 템플릿 기반 이메일 생성 (ChatGPT 사용 안 함)
          const weatherAI = new WeatherAISummaryService();
          const weatherDataInput = {
            hourlyForecasts: userWeatherData.hourlyForecasts.map(h => ({
              dateTime: h.dateTime,
              temperature: h.temperature,
              conditions: h.conditions,
              precipitationProbability: h.precipitationProbability,
              rainProbability: h.rainProbability,
              windSpeed: h.windSpeed,
              humidity: h.humidity,
            })),
            dailyForecasts: userWeatherData.dailyForecasts.map(d => ({
              date: d.date,
              dayOfWeek: d.dayOfWeek,
              highTemp: d.highTemp,
              lowTemp: d.lowTemp,
              conditions: d.conditions,
              precipitationProbability: d.precipitationProbability,
              rainProbability: d.rainProbability,
            }))
          };
          
          const personalizedSummary = await weatherAI.generateWeatherEmailByTemplate(
            {
              location: validatedData.location,
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
              timeOfDay: validatedData.timeOfDay,
              currentMonth: new Date().getMonth() + 1,
              includeHourlyForecast: true,
              includeDailyForecast: true,
            },
            weatherDataInput,
            userAddress
          );
          
          // 2-4. 개인화된 이메일 제목 생성
          const personalizedSubject = validatedData.subject || weatherAI.generateEmailSubjectByTemplate(
            new Date(),
            new Date(Date.now() + 12 * 60 * 60 * 1000)
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
          const userAddress = validatedData.location; // 폴백 시 기본 위치 사용
          const weatherAI = new WeatherAISummaryService();
          const fallbackSummary = await weatherAI.generateWeatherEmailByTemplate(
            {
              location: validatedData.location,
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
              timeOfDay: validatedData.timeOfDay,
              currentMonth: new Date().getMonth() + 1,
              includeHourlyForecast: true,
              includeDailyForecast: true,
            },
            fallbackWeatherData,
            userAddress
          );
          
          const fallbackSubject = validatedData.subject || weatherAI.generateEmailSubjectByTemplate(
            new Date(),
            new Date(Date.now() + 12 * 60 * 60 * 1000)
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
      emailScheduleId: null, // 수동 발송이므로 스케줄 ID 없음
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
      status: 'sent',
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
        sendLogId: emailSendLogId,
        clerkUserId: personalizedData?.recipient.clerkUserId || '',
        email: result.email,
        emailType: 'manual_personalized',
        templateUsed: 'weather_summary',
        personalizedContent: personalizedData ? {
          weatherData: personalizedData.weatherData,
          summary: personalizedData.summary,
          recipient: personalizedData.recipient
        } : null,
        status: result.success ? 'sent' : 'failed',
        errorDetails: result.error,
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
 * 크론잡에서 호출되므로 사용자 인증 없이 실행됩니다.
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
    
    // 기본 위치 설정 (크론잡에서는 사용자별 위치 조회 불가)
    const userLocationName = '서울';
    console.log(`📍 크론잡 이메일 발송 - 기본 위치 사용: ${userLocationName}`);

    // targetType 매핑: DB 값을 스키마에서 요구하는 형식으로 변환
    let mappedTargetType: 'all_users' | 'active_users' | 'specific_users' | 'test';
    switch (scheduleData.targetType) {
      case 'all':
        mappedTargetType = 'all_users';
        break;
      case 'specific':
        mappedTargetType = 'specific_users';
        break;
      case 'active':
        mappedTargetType = 'active_users';
        break;
      default:
        // DB에 이미 올바른 형식으로 저장된 경우
        mappedTargetType = scheduleData.targetType as 'all_users' | 'active_users' | 'specific_users';
        break;
    }

    // 크론잡 전용 이메일 발송 함수 호출 (인증 없이)
    const result = await sendScheduledEmailWithoutAuth({
      subject: scheduleData.emailSubject,
      location: userLocationName,
      timeOfDay: scheduleData.scheduleTime.startsWith('06') ? 'morning' : 'evening',
      targetType: mappedTargetType,
      targetUserIds: scheduleData.targetUserIds ? scheduleData.targetUserIds as string[] : undefined,
      forceRefreshWeather: true,
      useAgent: true, // 🤖 에이전트를 사용하여 고품질 날씨 이메일 생성
      scheduleId: scheduleId, // 스케줄 ID 전달
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
 * 개인화된 사용자 날씨 데이터 수집 (사용자 주소 포함)
 */
async function collectPersonalizedUserWeatherData(
  clerkUserId: string,
  fallbackLocation: string,
  timeOfDay: 'morning' | 'evening'
) {
  try {
    console.log(`🌤️ 사용자 ${clerkUserId.slice(0, 8)} 개인화 날씨 데이터 수집 시작`);
    
    // 1. 사용자 실제 주소 조회
    const userAddress = await getUserAddressForEmail(clerkUserId, fallbackLocation);
    
    // 2. 사용자별 날씨 데이터 수집
    const weatherData = await collectUserWeatherData(clerkUserId, fallbackLocation, timeOfDay);
    
    console.log(`✅ 사용자 ${clerkUserId.slice(0, 8)} 개인화 날씨 데이터 수집 완료`);
    
    return {
      userAddress,
      weatherData,
    };
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId.slice(0, 8)} 개인화 날씨 데이터 수집 실패:`, error);
    
    // 실패 시 기본값 반환
    return {
      userAddress: fallbackLocation,
      weatherData: await collectUserWeatherData(clerkUserId, fallbackLocation, timeOfDay),
    };
  }
}

/**
 * 사용자 위치 정보 조회 (user_locations 테이블의 address 필드 사용)
 * 크론잡에서도 사용 가능하도록 인증 없이 직접 DB 조회
 */
async function getUserAddressForEmail(clerkUserId: string, fallbackLocation: string): Promise<string> {
  try {
    // 직접 DB에서 사용자 위치 조회 (인증 없이)
    const locationData = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, clerkUserId))
      .limit(1);
    
    if (locationData.length > 0 && locationData[0].address) {
      console.log(`📍 사용자 ${clerkUserId.slice(0, 8)} 주소: ${locationData[0].address}`);
      return locationData[0].address;
    } else {
      console.log(`⚠️ 사용자 ${clerkUserId.slice(0, 8)} 주소 없음, 기본 위치 사용: ${fallbackLocation}`);
      return fallbackLocation;
    }
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId.slice(0, 8)} 위치 조회 실패:`, error);
    return fallbackLocation;
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
        dateTime: new Date(hour.forecastDatetime),
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
 * 크론잡 전용 이메일 수신자 목록 조회 (인증 없이)
 */
async function getEmailRecipientsWithoutAuth(
  targetType: 'all_users' | 'active_users' | 'specific_users',
  targetUserIds?: string[] | null
) {
  try {
    console.log(`📋 크론잡 Clerk 기반 이메일 수신자 조회: ${targetType}, 대상 ID: ${targetUserIds?.join(', ') || 'none'}`);
    
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
        console.log('🔍 크론잡 Clerk에서 모든 사용자 조회 중...');
        const response = await clerkClient.users.getUserList({
          limit: 500, // 최대 500명까지 조회
        });
        
        const allUsers = response.data || [];
        console.log(`📊 크론잡 Clerk 전체 사용자 수: ${allUsers.length}명`);
        
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
        
        console.log(`✅ 크론잡 이메일 발송 가능한 사용자: ${eligibleRecipients.length}명`);
        
        // 사용자 목록 로깅 (개발/디버깅용)
        eligibleRecipients.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.clerkUserId.slice(0, 8)}...)`);
        });
        
        return eligibleRecipients;
    }
  } catch (error) {
    console.error('❌ 크론잡 Clerk 기반 이메일 수신자 조회 실패:', error);
    return [];
  }
}

/**
 * 이메일 수신자 목록 조회 (Clerk 기반)
 */
async function getEmailRecipients(
  targetType: 'all_users' | 'active_users' | 'specific_users',
  targetUserIds?: string[] | null
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
 * 텍스트를 HTML로 변환 (간단한 포맷팅)
 */
function convertTextToHTML(text: string): string {
  // 줄바꿈을 <br>로 변환
  let html = text.replace(/\n/g, '<br>');
  
  // 이메일 주소를 링크로 변환
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #2563eb;">$1</a>');
  
  // 기본 스타일 적용
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${html}
    </div>
  `;
}

/**
 * 다음 발송 시간 계산 (KST → UTC 변환)
 */
function calculateNextSendTime(scheduleTime: string, timezone: string = 'Asia/Seoul'): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  
  // 현재 UTC 시간
  const nowUtc = new Date();
  
  // 한국시간으로 변환 (UTC + 9시간)
  const kstNow = new Date(nowUtc.getTime() + (9 * 60 * 60 * 1000));
  
  // 오늘 한국시간 기준 발송 시간 설정
  const kstToday = new Date(kstNow);
  kstToday.setHours(hours, minutes, 0, 0);
  
  // 다음 발송 시간 계산
  let kstNextSend: Date;
  
  if (kstToday > kstNow) {
    // 오늘 발송 시간이 아직 안 지났으면 오늘
    kstNextSend = kstToday;
  } else {
    // 오늘 발송 시간이 지났으면 내일
    kstNextSend = new Date(kstToday);
    kstNextSend.setDate(kstNextSend.getDate() + 1);
  }
  
  // KST → UTC 변환 (한국시간 - 9시간)
  const utcNextSend = new Date(kstNextSend.getTime() - (9 * 60 * 60 * 1000));
  
  console.log(`📅 스케줄 시간 계산:`);
  console.log(`   입력된 시간: ${scheduleTime} (KST)`);
  console.log(`   현재 UTC: ${nowUtc.toISOString()}`);
  console.log(`   현재 KST: ${kstNow.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`   다음 발송 KST: ${kstNextSend.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`   다음 발송 UTC: ${utcNextSend.toISOString()}`);
  
  return utcNextSend;
}
