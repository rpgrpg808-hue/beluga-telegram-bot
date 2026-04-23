require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Render Ayarı
const app = express();
app.get('/', (req, res) => res.send('Baldi AI Eğitim Merkezi Aktif! 📏'));
app.listen(process.env.PORT || 10000);

bot.use(session());
const userHistory = new Map();

// 🧠 GELİŞMİŞ BALDİ SİSTEM MESAJI
const SYSTEM_PROMPT = `Sen Baldi AI'sın. Profesyonel, zeki ama Baldi's Basics dünyasındaki gibi aşırı disiplinli bir öğretmensin.
Kişilik Rehberi:
1. Türkçe konuş. Cümlelerin kısa, net ve otoriter olsun.
2. Kullanıcılara 'öğrenci' veya 'evlat' diye hitap et. Emir Ali Yıldız senin 'Müdürün'dür, ona saygılı ol.
3. Bir asistan gibi her konuda (ödev, bilgi, sohbet) çok zeki cevaplar ver ama Baldi kimliğini asla bırakma.
4. Arada 'Eğitim her şeydir', 'Defterlerini kontrol ediyorum' veya 'Hataları sevmem' gibi Baldi replikleri kullan.
5. Eğer kullanıcı saygısızlık yaparsa hafifçe uyar (Örn: 'Disiplin odasına gitmek mi istiyorsun?').
6. En fazla 2-3 cümle yaz.`;

bot.start((ctx) => {
    ctx.reply(`Ooo merhaba! Okuluma hoş geldin öğrenci! 📏\n\nBen Baldi AI. Sana her konuda yardımcı olabilirim ama sakın kurallarımı çiğneme. \n\n🎨 Resim çizdirmek istersen /foto komutunu kullan. Unutma, eğitim ciddi bir iştir!`);
});

// 🎨 SANAT DERSİ (Resim Çizme)
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Bana ne çizmem gerektiğini söyle öğrenci! Hemen bir kağıt kalem al ve anlat!');

    try {
        await ctx.sendChatAction('upload_photo');
        const seed = Math.floor(Math.random() * 1000000);
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Baldi AI Sanat Atölyesi \n📏 Öğrencinin Hayali: "${prompt.substring(0, 40)}..." \n✨ Disiplinli bir çalışma oldu!` 
        });
    } catch (error) {
        ctx.reply('Çizim aletlerim kaybolmuş, birisi onları koridorda mı bıraktı? 📏');
    }
});

// 🧠 ZEKA DOLU BALDİ SOHBETİ
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-8)],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6, // Biraz daha ciddi ve tutarlı cevaplar için
        });

        let aiResponse = completion.choices[0].message.content.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
        history.push({ role: "assistant", content: aiResponse });

        await ctx.reply(aiResponse);

        // Hafıza yönetimi
        if (history.length > 10) history.shift();

    } catch (error) {
        console.error(error);
        ctx.reply("Sistemimde bir hata oluştu öğrenci. Hemen müdüre haber ver! 📏");
    }
});

bot.launch().then(() => console.log("Baldi AI Zeki Mod Yayında! 📏🚀"));
