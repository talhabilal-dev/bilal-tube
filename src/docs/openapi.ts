import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { ENV } from "../config/env.config.js";
import {
  changePasswordSchema,
  loginUserSchema,
  refreshAccessTokenSchema,
  registerUserSchema,
} from "../schema/user.schema.js";
import {
  createTweetSchema,
  getUserTweetsQuerySchema,
  updateTweetSchema,
} from "../schema/tweet.schema.js";
import {
  channelIdParamSchema as subscriptionChannelIdParamSchema,
  subscriberIdParamSchema,
} from "../schema/subscription.schema.js";
import {
  commentIdParamSchema,
  createCommentSchema,
  paginationQuerySchema,
  tweetIdParamSchema as commentTweetIdParamSchema,
  updateCommentSchema,
  videoIdParamSchema as commentVideoIdParamSchema,
} from "../schema/comment.schema.js";
import {
  channelIdParamSchema as dashboardChannelIdParamSchema,
  channelVideosQuerySchema,
} from "../schema/dashboard.schema.js";
import {
  commentIdParamSchema as likeCommentIdParamSchema,
  tweetIdParamSchema as likeTweetIdParamSchema,
  videoIdParamSchema as likeVideoIdParamSchema,
} from "../schema/like.schema.js";
import {
  createPlaylistSchema,
  playlistIdParamSchema,
  playlistVideoParamsSchema,
  updatePlaylistSchema,
  userIdParamSchema,
} from "../schema/playlist.schema.js";
import {
  getAllVideosQuerySchema,
  publishVideoSchema,
  updateVideoSchema,
  videoIdParamSchema,
} from "../schema/video.schema.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const messageSchema = z.object({
  message: z.string(),
});

const errorSchema = z.object({
  message: z.string(),
});

const registerMultipartSchema = registerUserSchema.extend({
  avatar: z.string().openapi({ type: "string", format: "binary" }),
  coverImage: z
    .string()
    .openapi({ type: "string", format: "binary" })
    .optional(),
});

const avatarUploadSchema = z.object({
  avatar: z.string().openapi({ type: "string", format: "binary" }),
});

const coverImageUploadSchema = z.object({
  coverImage: z.string().openapi({ type: "string", format: "binary" }),
});

const publishVideoMultipartSchema = publishVideoSchema.extend({
  video: z.string().openapi({ type: "string", format: "binary" }),
  thumbnail: z.string().openapi({ type: "string", format: "binary" }),
});

registry.registerPath({
  method: "get",
  path: "/api/v1/healthcheck",
  tags: ["Healthcheck"],
  summary: "Check API health",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: messageSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/register",
  tags: ["Users"],
  summary: "Register user",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: registerMultipartSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "User registered" },
    400: { description: "Bad request", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/login",
  tags: ["Users"],
  summary: "Login user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: loginUserSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Login successful" },
    401: { description: "Unauthorized", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/refresh-token",
  tags: ["Users"],
  summary: "Refresh access token",
  request: {
    body: {
      content: {
        "application/json": {
          schema: refreshAccessTokenSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Token refreshed" },
    401: { description: "Unauthorized", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/logout",
  tags: ["Users"],
  summary: "Logout user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Logout successful", content: { "application/json": { schema: messageSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/change-password",
  tags: ["Users"],
  summary: "Change password",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: changePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Password changed" },
    400: { description: "Bad request", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/getCurrentUser",
  tags: ["Users"],
  summary: "Get current user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Current user fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/updateAvatar",
  tags: ["Users"],
  summary: "Update avatar",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: avatarUploadSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Avatar updated" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/updateCoverImage",
  tags: ["Users"],
  summary: "Update cover image",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: coverImageUploadSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Cover image updated" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/{username}/profile",
  tags: ["Users"],
  summary: "Get user channel profile",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ username: z.string().trim().min(1) }),
  },
  responses: {
    200: { description: "Profile fetched" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/{username}/watch-history",
  tags: ["Users"],
  summary: "Get watch history",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ username: z.string().trim().min(1) }),
  },
  responses: {
    200: { description: "Watch history fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/tweets",
  tags: ["Tweets"],
  summary: "Create tweet",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTweetSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Tweet created" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/tweets/user/{userId}",
  tags: ["Tweets"],
  summary: "Get user tweets",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ userId: z.string().trim().min(1) }),
    query: getUserTweetsQuerySchema,
  },
  responses: {
    200: { description: "Tweets fetched" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/tweets/{tweetId}",
  tags: ["Tweets"],
  summary: "Update tweet",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ tweetId: z.string().trim().min(1) }),
    body: {
      content: {
        "application/json": {
          schema: updateTweetSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Tweet updated" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/tweets/{tweetId}",
  tags: ["Tweets"],
  summary: "Delete tweet",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ tweetId: z.string().trim().min(1) }),
  },
  responses: {
    200: { description: "Tweet deleted" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/subscriptions/c/{channelId}",
  tags: ["Subscriptions"],
  summary: "Get channel subscribers",
  security: [{ bearerAuth: [] }],
  request: {
    params: subscriptionChannelIdParamSchema,
  },
  responses: {
    200: { description: "Subscribers fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/subscriptions/c/{channelId}",
  tags: ["Subscriptions"],
  summary: "Toggle subscription",
  security: [{ bearerAuth: [] }],
  request: {
    params: subscriptionChannelIdParamSchema,
  },
  responses: {
    200: { description: "Subscription toggled" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/subscriptions/u/{subscriberId}",
  tags: ["Subscriptions"],
  summary: "Get subscribed channels",
  security: [{ bearerAuth: [] }],
  request: {
    params: subscriberIdParamSchema,
  },
  responses: {
    200: { description: "Subscribed channels fetched" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/videos",
  tags: ["Videos"],
  summary: "Get all videos",
  request: {
    query: getAllVideosQuerySchema,
  },
  responses: {
    200: { description: "Videos fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/videos",
  tags: ["Videos"],
  summary: "Publish a video",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: publishVideoMultipartSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Video published" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/videos/{videoId}",
  tags: ["Videos"],
  summary: "Get video by id",
  request: {
    params: videoIdParamSchema,
  },
  responses: {
    200: { description: "Video fetched" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/videos/{videoId}",
  tags: ["Videos"],
  summary: "Update video",
  security: [{ bearerAuth: [] }],
  request: {
    params: videoIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateVideoSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Video updated" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/videos/{videoId}",
  tags: ["Videos"],
  summary: "Delete video",
  request: {
    params: videoIdParamSchema,
  },
  responses: {
    200: { description: "Video deleted" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/videos/toggle/publish/{videoId}",
  tags: ["Videos"],
  summary: "Toggle publish status",
  security: [{ bearerAuth: [] }],
  request: {
    params: videoIdParamSchema,
  },
  responses: {
    200: { description: "Publish status updated" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/videos/views/{videoId}",
  tags: ["Videos"],
  summary: "Increment video views",
  security: [{ bearerAuth: [] }],
  request: {
    params: videoIdParamSchema,
  },
  responses: {
    200: { description: "Views incremented" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/comments/v/{videoId}",
  tags: ["Comments"],
  summary: "Get comments for video",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentVideoIdParamSchema,
    query: paginationQuerySchema,
  },
  responses: {
    200: { description: "Comments fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/comments/v/{videoId}",
  tags: ["Comments"],
  summary: "Add comment to video",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentVideoIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: createCommentSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Comment created" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/comments/t/{tweetId}",
  tags: ["Comments"],
  summary: "Get comments for tweet",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentTweetIdParamSchema,
    query: paginationQuerySchema,
  },
  responses: {
    200: { description: "Comments fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/comments/t/{tweetId}",
  tags: ["Comments"],
  summary: "Add comment to tweet",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentTweetIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: createCommentSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Comment created" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/comments/c/{commentId}",
  tags: ["Comments"],
  summary: "Update comment",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCommentSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Comment updated" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/comments/c/{commentId}",
  tags: ["Comments"],
  summary: "Delete comment",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentIdParamSchema,
  },
  responses: {
    200: { description: "Comment deleted" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/likes/toggle/v/{videoId}",
  tags: ["Likes"],
  summary: "Toggle video like",
  security: [{ bearerAuth: [] }],
  request: {
    params: likeVideoIdParamSchema,
  },
  responses: {
    200: { description: "Video like toggled" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/likes/toggle/c/{commentId}",
  tags: ["Likes"],
  summary: "Toggle comment like",
  security: [{ bearerAuth: [] }],
  request: {
    params: likeCommentIdParamSchema,
  },
  responses: {
    200: { description: "Comment like toggled" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/likes/toggle/t/{tweetId}",
  tags: ["Likes"],
  summary: "Toggle tweet like",
  security: [{ bearerAuth: [] }],
  request: {
    params: likeTweetIdParamSchema,
  },
  responses: {
    200: { description: "Tweet like toggled" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/likes/videos",
  tags: ["Likes"],
  summary: "Get liked videos",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Liked videos fetched" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/playlist",
  tags: ["Playlists"],
  summary: "Create playlist",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createPlaylistSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Playlist created" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/playlist/{playlistId}",
  tags: ["Playlists"],
  summary: "Get playlist by id",
  security: [{ bearerAuth: [] }],
  request: {
    params: playlistIdParamSchema,
  },
  responses: {
    200: { description: "Playlist fetched" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/playlist/{playlistId}",
  tags: ["Playlists"],
  summary: "Update playlist",
  security: [{ bearerAuth: [] }],
  request: {
    params: playlistIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updatePlaylistSchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Playlist updated" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/playlist/{playlistId}",
  tags: ["Playlists"],
  summary: "Delete playlist",
  security: [{ bearerAuth: [] }],
  request: {
    params: playlistIdParamSchema,
  },
  responses: {
    200: { description: "Playlist deleted" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/playlist/add/{videoId}/{playlistId}",
  tags: ["Playlists"],
  summary: "Add video to playlist",
  security: [{ bearerAuth: [] }],
  request: {
    params: playlistVideoParamsSchema,
  },
  responses: {
    200: { description: "Video added to playlist" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/playlist/remove/{videoId}/{playlistId}",
  tags: ["Playlists"],
  summary: "Remove video from playlist",
  security: [{ bearerAuth: [] }],
  request: {
    params: playlistVideoParamsSchema,
  },
  responses: {
    200: { description: "Video removed from playlist" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/playlist/user/{userId}",
  tags: ["Playlists"],
  summary: "Get user playlists",
  security: [{ bearerAuth: [] }],
  request: {
    params: userIdParamSchema,
  },
  responses: {
    200: { description: "User playlists fetched" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/dashboard/stats/{channelId}",
  tags: ["Dashboard"],
  summary: "Get channel stats",
  security: [{ bearerAuth: [] }],
  request: {
    params: dashboardChannelIdParamSchema,
  },
  responses: {
    200: { description: "Channel stats fetched" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/dashboard/videos/{channelId}",
  tags: ["Dashboard"],
  summary: "Get channel videos",
  security: [{ bearerAuth: [] }],
  request: {
    params: dashboardChannelIdParamSchema,
    query: channelVideosQuerySchema,
  },
  responses: {
    200: { description: "Channel videos fetched" },
  },
});

export const generateOpenApiDocument = (): ReturnType<
  OpenApiGeneratorV3["generateDocument"]
> => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  const serverUrls = (ENV.OPENAPI_SERVER_URLS ?? "http://localhost:8000")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  const servers = serverUrls.map((url, index) => ({
    url,
    description:
      index === 0 ? "Primary API server" : `API server ${index + 1}`,
  }));

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Bilal Tube API",
      version: "1.0.0",
      description: "API documentation for Bilal Tube backend",
    },
    servers,
  });
};
