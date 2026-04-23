require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

bot.use(session());

const userHistory = new Map();
const warnedUsers = new Set();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2 cümle yaz. Kullanıcıya 'kral' diye hitap et.`;

bot.start((ctx) => ctx.reply('Selam Emir Ali! Beluga hazır kral. 🐋\nNormal yazışabiliriz veya /foto ile resim çizdirebilirsin.'));

// FOTOĞRAF KOMUTU
bot.command('foto', async (ctx) => {
    const userId = ctx.from.id;
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) return ctx.reply('Kral, ne çizelim? Örnek: /foto karlı dağlar');

    if (prompt.length > 50 && !warnedUsers.has(userId)) {
        await ctx.reply('💡 İpucu: Kısa ve öz yazarsan daha iyi çiziyorum kral!');
        warnedUsers.add(userId); 
    }

    try {
        await ctx.sendChatAction('upload_photo');
        const seed = Math.floor(Math.random() * 1000000);
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanat Eseri: "${prompt.substring(0, 40)}..." \n✨ Beluga AI Özel Üretim 🐋` 
        });
    } catch (error) {
        ctx.reply('Fırçam kırıldı kral, sonra dene.');
    }
});

// METİN MESAJI
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
        });

        // "think" bloklarını temizleyen temiz cevap
        let aiResponse = completion.choices[0].message.content.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
        history.push({ role: "assistant", content: aiResponse });

        await ctx.reply(aiResponse);

    } catch (error) {
        console.error(error);
        ctx.reply("Kral bi takılma oldu, tekrar yazar mısın?");
    }
});

// Render Web Sunucusu
const app = express();
app.get('/', (req, res) => res.send('Beluga Sessiz Mod Aktif! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga Sessiz ve Hızlı! 🐋🚀"));
