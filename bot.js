require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');
const { MsEdgeTTS } = require('edge-tts'); // Doğru paket ismi
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tts = new MsEdgeTTS();

// Render'da dosya yazma hatası almamak için güvenli klasör
const tmpDir = '/tmp'; 

bot.use(session());
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
Cevapların kısa olsun (en fazla 2 cümle). Kullanıcıya her zaman 'kral' diye hitap et.`;

// Karizmatik Ahmet Sesi Fonksiyonu
async function sendVoiceResponse(ctx, text) {
    const fileName = `voice_${ctx.from.id}_${Date.now()}.mp3`;
    const filePath = path.join(tmpDir, fileName);
    
    try {
        await ctx.sendChatAction('record_voice');
        
        // tr-TR-AhmetNeural -> En iyi erkek sesi
        await tts.setMetadata('tr-TR-AhmetNeural', 'audio-24khz-48kbitrate-mono-mp3');
        await tts.saveAudio(text, filePath);
        
        await ctx.replyWithVoice({ source: filePath });
        
        // Dosyayı gönderdikten sonra siliyoruz (Yer kaplamasın)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Ses motoru hatası:", e);
        ctx.reply("Sesim kısıldı kral, bir daha dener misin?");
    }
}

bot.start((ctx) => ctx.reply('Selam Emir Ali! Beluga artık Ahmet sesiyle canlıda! 🐋🚀\n\n- /foto [kelime] ile resim çizerim.\n- Mesajın sonuna "sesli" yazarsan konuşurum!'));

// Fotoğraf komutu
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Kral, ne çizelim?');
    
    const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    await ctx.replyWithPhoto(photoUrl, { caption: `🎨 Beluga Özel Üretim 🐋` });
});

// Sesli mesajlara sesle cevap ver
bot.on('voice', async (ctx) => {
    await sendVoiceResponse(ctx, "Sesini aldım kral! Yeni sesim nasıl, sence de çok karizmatik değil mi?");
});

// Normal metin mesajları
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
        
        // Eğer kullanıcı "sesli" veya "konuş" dediyse sesli cevap at
        if (msgLower.includes("sesli") || msgLower.includes("konuş") || msgLower.includes("oku")) {
            await sendVoiceResponse(ctx, res);
        }
    } catch (err) { 
        console.error("Hata:", err);
        ctx.reply('Bir takılma oldu kral, tekrar yazar mısın?'); 
    }
});

// Web Sunucusu (Render için zorunlu)
const app = express();
app.get('/', (req, res) => res.send('Beluga Ahmet Voice Online! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Ahmet sesiyle gazlıyor! 🚀"));
