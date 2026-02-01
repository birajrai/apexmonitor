import fetch from 'node-fetch';

export async function send(payload) {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: `**${payload.monitorName}** is now **${payload.status.toUpperCase()}**`,
        }),
    });
}
