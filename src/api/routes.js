import { Router } from 'express';
import { ChannelType, EmbedBuilder } from 'discord.js';
import db from '../services/database.js';
import musicManager from '../services/music/MusicManager.js';
import localLibrary from '../services/music/LocalLibrary.js';

export function createApiRouter(client) {
  const router = Router();

  // 🛡️ API Authentication Middleware (validates x-api-key)
  const requireApiKey = (req, res, next) => {
    const authKey = req.headers['x-api-key'] || req.query.apiKey;
    const expected = process.env.API_KEY || 'veplexity_secret_123';
    if (!authKey || authKey !== expected) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }
    next();
  };

  // ─── 1. PUBLIC / DASHBOARD TELEMETRY ───────────────────────────────────────
  router.get('/stats', (req, res) => {
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);

    const memoryUsage = process.memoryUsage();
    const ramMb = Math.round(memoryUsage.rss / 1024 / 1024);

    const lavalinkConnected = musicManager.lavalink?.nodeManager?.nodes?.values()?.next()?.value?.connected || false;

    res.json({
      status: 'online',
      ping: client.ws?.ping ?? 0,
      servers: client.guilds.cache.size,
      users: client.users.cache.size,
      uptime: {
        rawSeconds: uptimeSec,
        formatted: `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`
      },
      ramUsageMb: ramMb,
      lavalink: {
        connected: lavalinkConnected,
        activePlayers: musicManager.lavalink?.players?.size || 0
      },
      totalCases: db.data.caseCounter || 0,
      totalLocalFlacTracks: localLibrary.getTotalCount(),
      recentCases: Object.entries(db.data.cases || {})
        .slice(-10)
        .map(([id, data]) => ({ id, ...data }))
        .reverse()
    });
  });

  // ─── 2. GUILDS & SERVER CONFIGURATION ──────────────────────────────────────
  router.get('/guilds', requireApiKey, (req, res) => {
    const guilds = client.guilds.cache.map(g => {
      const textChannels = g.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      const voiceChannels = g.channels.cache
        .filter(c => c.type === ChannelType.GuildVoice)
        .map(c => ({ id: c.id, name: c.name, memberCount: c.members.size }));

      const categories = g.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => ({ id: c.id, name: c.name }));

      return {
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 128 }),
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        channels: { text: textChannels, voice: voiceChannels, categories },
        config: {
          modLogChannel: db.getModLogChannel(g.id),
          welcome: db.getWelcomeConfig(g.id),
          tempVc: db.getTempVcConfig(g.id),
          starboard: db.getStarboardConfig(g.id),
          chatbot: db.isChatbotEnabled(g.id),
          aiMode: db.getAiMode(g.id)
        }
      };
    });

    res.json(guilds);
  });

  router.get('/guilds/:guildId', requireApiKey, (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found or bot is not a member' });

    const textChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ id: c.id, name: c.name }));

    const voiceChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildVoice)
      .map(c => ({ id: c.id, name: c.name, memberCount: c.members.size }));

    const categories = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: c.name }));

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      channels: { text: textChannels, voice: voiceChannels, categories },
      config: {
        modLogChannel: db.getModLogChannel(guild.id),
        welcome: db.getWelcomeConfig(guild.id),
        tempVc: db.getTempVcConfig(guild.id),
        starboard: db.getStarboardConfig(guild.id),
        chatbot: db.isChatbotEnabled(guild.id),
        aiMode: db.getAiMode(guild.id)
      }
    });
  });

  router.post('/guilds/:guildId/settings', requireApiKey, (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { modLogChannel, welcome, tempVc, starboard, chatbot, aiMode } = req.body || {};

    if (modLogChannel !== undefined) db.setModLogChannel(guildId, modLogChannel);
    if (welcome !== undefined) db.setWelcomeConfig(guildId, welcome);
    if (tempVc !== undefined) db.setTempVcConfig(guildId, tempVc);
    if (starboard !== undefined) db.setStarboardConfig(guildId, starboard);
    if (chatbot !== undefined) db.setChatbotGuild(guildId, !!chatbot);
    if (aiMode !== undefined) db.setAiMode(guildId, aiMode);

    res.json({
      success: true,
      message: 'Server settings updated successfully',
      updated: {
        modLogChannel: db.getModLogChannel(guildId),
        welcome: db.getWelcomeConfig(guildId),
        tempVc: db.getTempVcConfig(guildId),
        starboard: db.getStarboardConfig(guildId),
        chatbot: db.isChatbotEnabled(guildId),
        aiMode: db.getAiMode(guildId)
      }
    });
  });

  // ─── 3. LOSSLESS STUDIO MASTER LIBRARY ─────────────────────────────────────
  router.get('/music/library', requireApiKey, (req, res) => {
    const search = req.query.search || '';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const results = localLibrary.search(search, limit);

    res.json({
      totalCount: localLibrary.getTotalCount(),
      returnedCount: results.length,
      storageDir: localLibrary.musicDir,
      tracks: results
    });
  });

  // ─── 4. LIVE MUSIC STUDIO & CONTROLLER ─────────────────────────────────────
  router.get('/music/:guildId', requireApiKey, (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const nowPlaying = musicManager.getNowPlayingDisplay(guildId);
    const queue = musicManager.getQueue(guildId);
    const activeFilters = musicManager.getActiveFilters(guildId);

    const voiceChannels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildVoice)
      .map(c => ({ id: c.id, name: c.name, memberCount: c.members.size }));

    res.json({
      guildId,
      isPlaying: !!(nowPlaying && !nowPlaying.isPaused),
      nowPlaying,
      activeFilters,
      queue: queue?.tracks || [],
      voiceChannels
    });
  });

  router.post('/music/:guildId/action', requireApiKey, async (req, res) => {
    const { guildId } = req.params;
    const { action, query, voiceChannelId, textChannelId, volume, position, preset, index } = req.body || {};

    try {
      switch (action) {
        case 'play': {
          if (!query) return res.status(400).json({ error: 'Query is required for play action' });
          if (!voiceChannelId) return res.status(400).json({ error: 'Target voiceChannelId is required' });
          const result = await musicManager.playDirect(guildId, voiceChannelId, textChannelId || null, query, { username: 'Web Dashboard' });
          return res.json({ success: true, message: `Queued: ${result.title}`, data: result });
        }
        case 'pause': {
          musicManager.pause(guildId);
          return res.json({ success: true, message: 'Playback paused' });
        }
        case 'resume': {
          musicManager.resume(guildId);
          return res.json({ success: true, message: 'Playback resumed' });
        }
        case 'skip': {
          musicManager.skip(guildId);
          return res.json({ success: true, message: 'Track skipped' });
        }
        case 'stop': {
          musicManager.stop(guildId);
          return res.json({ success: true, message: 'Playback stopped and disconnected' });
        }
        case 'volume': {
          const vol = musicManager.setVolume(guildId, volume);
          return res.json({ success: true, message: `Volume set to ${vol}%`, volume: vol });
        }
        case 'seek': {
          const formatted = await musicManager.seek(guildId, position);
          return res.json({ success: true, message: `Seeked to ${formatted}` });
        }
        case 'filter': {
          if (!preset) return res.status(400).json({ error: 'Preset is required for filter action' });
          const result = await musicManager.setFilter(guildId, preset);
          return res.json({ success: true, message: result.name, active: result.active });
        }
        case 'autoplay': {
          const isNowOn = musicManager.toggleAutoplay(guildId);
          return res.json({ success: true, isAutoplay: isNowOn, message: `Autoplay ${isNowOn ? 'Enabled' : 'Disabled'}` });
        }
        case 'removeTrack': {
          const removedTitle = musicManager.removeQueueTrack(guildId, index);
          return res.json({ success: true, message: `Removed track: ${removedTitle}` });
        }
        case 'clearQueue': {
          musicManager.clearQueue(guildId);
          return res.json({ success: true, message: 'Queue cleared' });
        }
        default:
          return res.status(400).json({ error: `Unknown action: "${action}"` });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });


  router.post('/system/rescan', requireApiKey, (req, res) => {
    localLibrary.scan();
    res.json({
      success: true,
      message: 'Lossless audio library rescanned successfully',
      totalCount: localLibrary.getTotalCount()
    });
  });

  // ─── 5. MODERATION DIRECT ACTIONS ──────────────────────────────────────────
  router.get('/moderation/cases', requireApiKey, (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    const actionFilter = (req.query.action || '').toLowerCase();

    let allCases = Object.entries(db.data.cases || {}).map(([id, data]) => ({ id, ...data }));

    if (actionFilter) {
      allCases = allCases.filter(c => (c.action || '').toLowerCase() === actionFilter);
    }

    if (search) {
      allCases = allCases.filter(c =>
        (c.user || '').includes(search) ||
        (c.reason || '').toLowerCase().includes(search) ||
        (c.moderator || '').includes(search)
      );
    }

    res.json({
      total: allCases.length,
      cases: allCases.reverse()
    });
  });

  router.post('/moderation/action', requireApiKey, async (req, res) => {
    const { action, guildId, userId, reason, durationMs, channelId, title, message, color, ping } = req.body || {};
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Target guild not found' });

    try {
      switch (action) {
        case 'warn': {
          if (!userId) return res.status(400).json({ error: 'Target userId is required' });
          const caseId = db.createCase({
            action: 'warn',
            userId,
            moderatorId: 'Dashboard Admin',
            reason: reason || 'Warned via Web Dashboard',
            guildId
          });
          db.addWarn(userId);
          return res.json({ success: true, caseId, message: `Warned user <@${userId}>` });
        }
        case 'timeout': {
          if (!userId) return res.status(400).json({ error: 'Target userId is required' });
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return res.status(404).json({ error: 'Member not found in guild' });
          const time = durationMs || (10 * 60 * 1000); // 10m default
          await member.timeout(time, reason || 'Timeout via Web Dashboard');
          const caseId = db.createCase({
            action: 'timeout',
            userId,
            moderatorId: 'Dashboard Admin',
            reason: reason || 'Timeout via Web Dashboard',
            guildId
          });
          return res.json({ success: true, caseId, message: `Timed out user for ${Math.round(time / 60000)} minutes` });
        }
        case 'kick': {
          if (!userId) return res.status(400).json({ error: 'Target userId is required' });
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return res.status(404).json({ error: 'Member not found in guild' });
          await member.kick(reason || 'Kicked via Web Dashboard');
          const caseId = db.createCase({
            action: 'kick',
            userId,
            moderatorId: 'Dashboard Admin',
            reason: reason || 'Kicked via Web Dashboard',
            guildId
          });
          return res.json({ success: true, caseId, message: `Kicked user <@${userId}>` });
        }
        case 'ban': {
          if (!userId) return res.status(400).json({ error: 'Target userId is required' });
          await guild.members.ban(userId, { reason: reason || 'Banned via Web Dashboard' });
          const caseId = db.createCase({
            action: 'ban',
            userId,
            moderatorId: 'Dashboard Admin',
            reason: reason || 'Banned via Web Dashboard',
            guildId
          });
          return res.json({ success: true, caseId, message: `Banned user <@${userId}>` });
        }
        case 'announce': {
          if (!channelId || !title || !message) {
            return res.status(400).json({ error: 'channelId, title, and message are required' });
          }
          const targetChannel = guild.channels.cache.get(channelId);
          if (!targetChannel?.isTextBased()) {
            return res.status(404).json({ error: 'Target text channel not found' });
          }

          const embedColor = color === 'red' ? 0xff5c5c : color === 'green' ? 0x6effb0 : color === 'purple' ? 0xb18cff : 0x6ec6ff;
          const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(title)
            .setDescription(message)
            .setFooter({ text: 'Official Announcement • VePlexity Operations' })
            .setTimestamp();

          const content = ping === '@everyone' ? '@everyone' : ping === '@here' ? '@here' : undefined;
          await targetChannel.send({ content, embeds: [embed] });

          return res.json({ success: true, message: `Announcement sent to #${targetChannel.name}` });
        }
        default:
          return res.status(400).json({ error: `Unknown moderation action: "${action}"` });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 6. LEADERBOARDS & ECONOMY ─────────────────────────────────────────────
  router.get('/leaderboard', requireApiKey, (req, res) => {
    const topLevels = db.getTopLevels(15);
    const topBalances = db.getTopBalances(15);

    res.json({
      xp: topLevels,
      economy: topBalances
    });
  });

  return router;
}

export default createApiRouter;
