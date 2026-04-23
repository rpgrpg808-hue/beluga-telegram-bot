require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

// 🐋 BELUGA CORE
const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Render için basit web sunucusu (Port 10000 Render standardıdır)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Beluga AI v2.0: Sistemler Aktif! 🐋🚀'));
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda dinleniyor...`));

bot.use(session());

const userHistory = new Map();
const warnedUsers = new Set();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi, zeki ve enerjik bir asistansın. 
En fazla 2-3 cümle yaz. Kullanıcılara 'kral' diye hitap et. 
Seni Emir Ali Yıldız geliştirdi.`;

// 🏁 BAŞLANGIÇ
bot.start((ctx) => {
    ctx.reply(`Selam ${ctx.from.first_name}! Beluga hazır kral. 🐋\n\n💬 Bana her şeyi sorabilirsin.\n🎨 Resim için: /foto [istediğin şey]`);
});

// 🎨 FOTOĞRAF KOMUTU (Geliştirilmiş)
bot.command('foto', async (ctx) => {
    const userId = ctx.from.id;
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) return ctx.reply('Kral, hayalindeki resmi yaz ki çizeyim. Örnek: /foto neon şehir');

    // Uzun prompt uyarısı
    if (prompt.length > 50 && !warnedUsers.has(userId)) {
        await ctx.reply('💡 İpucu: Kısa ve öz yazarsan resimler daha efsane çıkar kral!');
        warnedUsers.add(userId); 
    }

    try {
        await ctx.sendChatAction('upload_photo');
        const seed = Math.floor(Math.random() * 1000000);
        // Kaliteyi artırmak için parametreleri güncelledik
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanatçı: Beluga AI\n✨ Prompt: "${prompt.substring(0, 45)}..."` 
        });
    } catch (error) {
        console.error("Foto Hatası:", error);
        ctx.reply('Fırçayı elimden düşürdüm kral, bi daha dene.');
    }
});

// 🧠 YAPAY ZEKA SOHBET (llama-3.3-70b)
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-6)],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        let aiResponse = completion.choices[0].message.content
            .replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '') // Düşünce bloklarını temizle
            .trim();

        history.push({ role: "assistant", content: aiResponse });
        
        // Geçmişi temiz tut (Bellek şişmesin)
        if (history.length > 10) history.shift();

        await ctx.reply(aiResponse);

    } catch (error) {
        console.error("Groq Hatası:", error);
        ctx.reply("Kral kafam biraz karıştı, bi daha yazar mısın?");
    }
});

// 🚀 ATEŞLE
bot.launch().then(() => console.log("Beluga AI Telegram'da süzülüyor! 🐋💎"));

// Güvenli kapatma
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
