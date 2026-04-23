require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Hafıza ve Uyarı Sistemleri
const userHistory = new Map();
const warnedUsers = new Set();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2-4 cümle yaz. Kullanıcıya 'kral' diye hitap et.
Sürekli aynı şeyi tekrarlama, yaratıcı ol.`;

// Bot Başlatma
bot.start((ctx) => ctx.reply('Selam kral! Beluga 7/24 aktif! 🐋\nSohbet edebiliriz veya /foto yazarak resim çizdirebilirsin!'));

// Hafıza Sıfırlama
bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral! Yeni bir başlangıç yapalım. 🐋');
});

// Fotoğraf Oluşturma Komutu (Uyarı Sistemli)
bot.command('foto', async (ctx) => {
    const userId = ctx.from.id;
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) {
        return ctx.reply('Kral, ne çizmemi istersin? Örnek: /foto karlı dağlarda koşan balina');
    }

    // TEK SEFERLİK UYARI: Eğer prompt uzunsa ve kullanıcı daha önce uyarılmadıysa
    if (prompt.length > 50 && !warnedUsers.has(userId)) {
        await ctx.reply('💡 Küçük bir ipucu kral: Çok uzun yazınca bazen kafam karışıyor. Eğer resim kötü çıkarsa daha kısa ve öz yazmayı dene!');
        warnedUsers.add(userId); 
    }

    try {
        await ctx.sendChatAction('upload_photo');
        
        // Reklamsız ve filigransız Pollinations URL'si
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanat Eseri: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\n✨ Beluga AI Özel Üretim 🐋` 
        });
    } catch (error) {
        ctx.reply('Fırçam kırıldı kral, çizemedim. 😔🎨');
    }
});

// Normal Sohbet Akışı
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: userMessage });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-6)],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        let aiResponse = completion.choices[0].message.content.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();

        if (aiResponse) {
            history.push({ role: "assistant", content: aiResponse });
            if (history.length > 12) history.splice(0, 2); 
            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("Hata:", error.message);
        ctx.reply("Kral bi takılma oldu, /reset yaz düzelir.");
    }
});

// Render Web Sunucusu (Uptime Robot İçin)
const app = express();
app.get('/', (req, res) => res.send('Beluga AI Canlıda! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Online, Resim Modu ve Uyarı Sistemi Aktif! 🐋🎨"));
