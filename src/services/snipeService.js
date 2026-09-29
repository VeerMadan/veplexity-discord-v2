// Stores the most recent deleted and edited messages per channel for /snipe
export const deletedMessages = new Map(); // channelId -> { content, authorTag, authorId, authorAvatar, image, timestamp }
export const editedMessages = new Map();  // channelId -> { oldContent, newContent, authorTag, authorId, authorAvatar, timestamp }

export default {
  deletedMessages,
  editedMessages
};
