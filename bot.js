require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');
const { MsEdgeTTS } = require('edge-tts-api');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tts = new MsEdgeTTS();

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

bot.use(session());
const userHistory = new Map();
const warnedUsers = new Set();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2 cümle yaz. Kullanıcıya 'kral' diye hitap et.`;

// Karizmatik Erkek Sesi Fonksiyonu
async function sendVoiceResponse(ctx, text) {
    const fileName = path.join(tmpDir, `voice_${ctx.from.id}_${Date.now()}.mp3`);
    
    try {
        await ctx.sendChatAction('record_voice');
        // tr-TR-AhmetNeural: Microsoft'un en iyi Türkçe erkek sesidir.
        await tts.setMetadata('tr-TR-AhmetNeural', 'audio-24khz-48kbitrate-mono-mp3');
        const filePath = await tts.saveAudio(text, fileName);
        
        await ctx.replyWithVoice({ source: filePath });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Ses hatası:", e);
    }
}

bot.start((ctx) => ctx.reply('Selam Emir Ali! Artık sesim daha karizmatik kral. 🐋\nBana ses atarsan veya sonuna "sesli" yazarsan yeni sesimi duyabilirsin!'));

bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Kral, ne çizelim?');
    const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    await ctx.replyWithPhoto(photoUrl, { caption: `🎨 Sanat Eseri \n✨ Beluga Özel Üretim 🐋` });
});

bot.on('voice', async (ctx) => {
    await sendVoiceResponse(ctx, "Sesini aldım kral, yeni sesimle sana cevap veriyorum! Nasıl, daha havalı olmuş muyum?");
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgLower = ctx.message.text.toLowerCase();
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-4)],
            model: "llama-3.3-70b-versatile",
        });

        let res = completion.choices[0].message.content.trim();
        history.push({ role: "assistant", content: res });
        await ctx.reply(res);
        
        if (msgLower.includes("sesli") || msgLower.includes("konuş")) {
            await sendVoiceResponse(ctx, res);
        }
    } catch (err) { ctx.reply('Takıldım kral.'); }
});

const app = express();
app.get('/', (req, res) => res.send('Beluga Ahmet Sesiyle Canlıda! 🐋'));
app.listen(process.env.PORT || 3000);
bot.launch();
