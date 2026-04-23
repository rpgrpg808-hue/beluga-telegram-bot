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

// tmp klasörünü garantiye alalım
const tmpDir = path.join('/tmp'); 
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

bot.use(session());
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2 cümle yaz. Kullanıcıya 'kral' diye hitap et.`;

async function sendVoiceResponse(ctx, text) {
    const fileName = `voice_${ctx.from.id}_${Date.now()}.mp3`;
    const filePath = path.join(tmpDir, fileName);
    
    try {
        await ctx.sendChatAction('record_voice');
        await tts.setMetadata('tr-TR-AhmetNeural', 'audio-24khz-48kbitrate-mono-mp3');
        const savedPath = await tts.saveAudio(text, filePath);
        
        await ctx.replyWithVoice({ source: savedPath });
        if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
    } catch (e) {
        console.error("Ses hatası:", e);
        ctx.reply("Sesim kısıldı kral, bir daha dene.");
    }
}

bot.start((ctx) => ctx.reply('Selam Emir Ali! Beluga Ahmet sesiyle hazır! 🐋'));

bot.on('text', async (ctx) => {
    const msgLower = ctx.message.text.toLowerCase();
    const userId = ctx.from.id;
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
    } catch (err) { console.log(err); }
});

const app = express();
app.get('/', (req, res) => res.send('Beluga Online!'));
app.listen(process.env.PORT || 3000);
bot.launch();
