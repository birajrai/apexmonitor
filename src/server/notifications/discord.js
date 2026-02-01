import fetch from 'node-fetch';

export async function send(payload) {
    if (!process.env.DISCORD_WEBHOOK_URL) {
        console.log('[notification] Discord webhook URL not configured, skipping notification');
        return;
    }

    try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `**${payload.monitorName}** is now **${payload.status.toUpperCase()}**`,
            }),
        });
    } catch (error) {
        console.error('[notification] Failed to send Discord notification:', error.message);
    }
}
