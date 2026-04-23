require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

// NOT: Resim çizmek için axios'a veya canvas'a gerek kalmadı,
// Telegraf direkt linki resim olarak gönderebiliyor kral!

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2-4 cümle yaz. Kullanıcıya 'kral' diye hitap et.
Sürekli aynı şeyi tekrarlama, yaratıcı ol.`;

bot.start((ctx) => ctx.reply('Selam kral! Render üzerinden Beluga 7/24 aktif! 🐋\nNormal yaz sohbet edelim, veya /foto yaz resim çizeyim!'));

bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral! Yeni bir başlangıç yapalım. 🐋');
});

// Fotoğraf Oluşturma Komutu (EN GÜVENLİ YÖNTEM)
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) {
        return ctx.reply('Kral, ne çizmemi istersin? Örnek: /foto karlı dağlarda koşan balina');
    }

    try {
        await ctx.sendChatAction('upload_photo');
        
        // Pollinations.ai URL'si - nologo=true ile tertemiz görsel alırız
        // seed=... ekleyerek her istekte farklı resim gelmesini garantiliyoruz
        const photoUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        
        // Telegraf direkt linki resim olarak kabul ediyor, çökme riski sıfır!
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanat Eseri: "${prompt}"\n\n✨ Beluga AI Özel Üretim 🐋` 
        });
    } catch (error) {
        ctx.reply('Fırçam kırıldı kral, çizemedim. Tekrar dene. 😔🎨');
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
            if (history.length > 12) history.splice(0, 2); // Hafızayı 6 mesaj çiftinde tut
            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("Hata:", error.message);
        ctx.reply("Kral bi takılma oldu, /reset yaz düzelir.");
    }
});

// Render için basit bir web sunucusu (Uptime Robot'un kontrol etmesi için)
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Beluga AI Canlıda! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Online & Resim Modu Aktif! 🐋🎨"));
