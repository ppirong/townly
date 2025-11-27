import { relations } from "drizzle-orm/relations";
import { kakaoMessages, kakaoResponses, scheduledMessages, scheduledMessageLogs, marts, martDiscounts, martDiscountItems, emailSchedules, emailSendLogs, individualEmailLogs } from "./schema";

export const kakaoResponsesRelations = relations(kakaoResponses, ({one}) => ({
	kakaoMessage: one(kakaoMessages, {
		fields: [kakaoResponses.messageId],
		references: [kakaoMessages.id]
	}),
}));

export const kakaoMessagesRelations = relations(kakaoMessages, ({many}) => ({
	kakaoResponses: many(kakaoResponses),
}));

export const scheduledMessageLogsRelations = relations(scheduledMessageLogs, ({one}) => ({
	scheduledMessage: one(scheduledMessages, {
		fields: [scheduledMessageLogs.scheduledMessageId],
		references: [scheduledMessages.id]
	}),
}));

export const scheduledMessagesRelations = relations(scheduledMessages, ({many}) => ({
	scheduledMessageLogs: many(scheduledMessageLogs),
}));

export const martDiscountsRelations = relations(martDiscounts, ({one, many}) => ({
	mart: one(marts, {
		fields: [martDiscounts.martId],
		references: [marts.id]
	}),
	martDiscountItems: many(martDiscountItems),
}));

export const martsRelations = relations(marts, ({many}) => ({
	martDiscounts: many(martDiscounts),
}));

export const martDiscountItemsRelations = relations(martDiscountItems, ({one}) => ({
	martDiscount: one(martDiscounts, {
		fields: [martDiscountItems.discountId],
		references: [martDiscounts.id]
	}),
}));

export const emailSendLogsRelations = relations(emailSendLogs, ({one, many}) => ({
	emailSchedule: one(emailSchedules, {
		fields: [emailSendLogs.emailScheduleId],
		references: [emailSchedules.id]
	}),
	individualEmailLogs: many(individualEmailLogs),
}));

export const emailSchedulesRelations = relations(emailSchedules, ({many}) => ({
	emailSendLogs: many(emailSendLogs),
}));

export const individualEmailLogsRelations = relations(individualEmailLogs, ({one}) => ({
	emailSendLog: one(emailSendLogs, {
		fields: [individualEmailLogs.emailSendLogId],
		references: [emailSendLogs.id]
	}),
}));