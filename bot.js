require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');
const edgeTTS = require('edge-tts');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const tmpDir = '/tmp';

bot.use(session());
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. Cevapların kısa olsun (en fazla 2 cümle). Kullanıcıya her zaman 'kral' diye hitap et.`;

async function sendVoiceResponse(ctx, text) {
    const fileName = `voice_${ctx.from.id}_${Date.now()}.mp3`;
    const filePath = path.join(tmpDir, fileName);
    
    try {
        await ctx.sendChatAction('record_voice');
        await edgeTTS.saveAudio({ text, output: filePath, voice: 'tr-TR-AhmetNeural' });
        await ctx.replyWithVoice({ source: filePath });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Ses motoru hatasi:", e);
        ctx.reply("Sesim kisildi kral, bir daha dener misin?");
    }
}

bot.start((ctx) => ctx.reply('Selam! Beluga artik Ahmet sesiyle canlida! /foto [kelime] ile resim cizerim. Mesajin sonuna "sesli" yazarsan konusurum!'));

bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Kral, ne cizelim?');
    const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    await ctx.replyWithPhoto(photoUrl, { caption: 'Beluga Ozel Uretim' });
});

bot.on('voice', async (ctx) => {
    await sendVoiceResponse(ctx, "Sesini aldim kral! Yeni sesim nasil, karizmatik degil mi?");
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
        if (msgLower.includes("sesli") || msgLower.includes("konus") || msgLower.includes("oku")) {
            await sendVoiceResponse(ctx, res);
        }
    } catch (err) {
        console.error("Hata:", err);
        ctx.reply('Bir takilma oldu kral, tekrar yazar misin?');
    }
});

const app = express();
app.get('/', (req, res) => res.send('Beluga Ahmet Voice Online!'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Ahmet sesiyle gazliyor!"));
