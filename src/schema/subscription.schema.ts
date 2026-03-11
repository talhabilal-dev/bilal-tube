import { z } from "zod";

export const channelIdParamSchema = z.object({
  channelId: z.string().trim().min(1, "Channel ID is required"),
});

export const subscriberIdParamSchema = z.object({
  subscriberId: z.string().trim().min(1, "Subscriber ID is required"),
});

export type ChannelIdParamInput = z.infer<typeof channelIdParamSchema>;
export type SubscriberIdParamInput = z.infer<typeof subscriberIdParamSchema>;
