require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Render'da geçici dosyalar için dizin kontrolü
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

bot.use(session());

const userHistory = new Map();
const warnedUsers = new Set();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2-3 cümle yaz. Kullanıcıya 'kral' diye hitap et.`;

// Ses dosyası oluşturup gönderen fonksiyon
async function sendVoiceResponse(ctx, text) {
    const fileName = path.join(tmpDir, `voice_${ctx.from.id}_${Date.now()}.mp3`);
    const gtts = new gTTS(text, 'tr');

    gtts.save(fileName, async (err) => {
        if (err) return console.error("Ses hatası:", err);
        
        try {
            await ctx.sendChatAction('record_voice');
            await ctx.replyWithVoice({ source: fileName });
            if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
        } catch (e) {
            console.error("Gönderim hatası:", e);
        }
    });
}

bot.start((ctx) => ctx.reply('Selam kral! Beluga hazır. 🐋\n- Normal yazarsan yazarım.\n- Mesajın sonuna "sesli" yazarsan veya bana ses atarsan konuşurum!\n- /foto ile resim çizerim.'));

// FOTOĞRAF KOMUTU (Garantili reklamsız sürüm)
bot.command('foto', async (ctx) => {
    const userId = ctx.from.id;
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) return ctx.reply('Kral, ne çizelim? Örnek: /foto karlı dağlar');

    if (prompt.length > 50 && !warnedUsers.has(userId)) {
        await ctx.reply('💡 İpucu: Kısa ve öz yazarsan çok daha iyi çiziyorum kral!');
        warnedUsers.add(userId); 
    }

    try {
        await ctx.sendChatAction('upload_photo');
        const seed = Math.floor(Math.random() * 1000000);
        // Resim motoru linki düzeltildi
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanat Eseri: "${prompt.substring(0, 40)}..." \n✨ Beluga AI Özel Üretim 🐋` 
        });
    } catch (error) {
        ctx.reply('Fırçam kırıldı kral, sonra dene.');
    }
});

// SESLİ MESAJ GELDİĞİNDE
bot.on('voice', async (ctx) => {
    const response = "Sesini aldım kral! Şimdilik sadece dinleyebiliyorum ama ben de sana sesli cevap veriyorum. Çok havalısın!";
    await sendVoiceResponse(ctx, response);
});

// NORMAL METİN MESAJI
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const msgLower = ctx.message.text.toLowerCase();
    
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-6)],
            model: "llama-3.3-70b-versatile",
        });

        let aiResponse = completion.choices[0].message.content.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
        history.push({ role: "assistant", content: aiResponse });

        // Önce yazı at
        await ctx.reply(aiResponse);
        
        // Şartlar sağlanırsa ses at
        const voiceTriggers = ["sesli", "konuş", "oku", "anlat", "ses ver"];
        if (voiceTriggers.some(t => msgLower.includes(t))) {
            await sendVoiceResponse(ctx, aiResponse);
        }

    } catch (error) {
        ctx.reply("Kral bi takılma oldu, /reset yaz düzelir.");
    }
});

// Render Web Sunucusu
const app = express();
app.get('/', (req, res) => res.send('Beluga Akıllı Sesli Mod Online! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Canavar Gibi Çalışıyor! 🐋🚀"));
