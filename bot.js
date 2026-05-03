require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Render Ayarı (Botun kapanmaması için)
const app = express();
app.get('/', (req, res) => res.send('Dixy Aktif! Dixs Network Yayında! 🐋🚀'));
app.listen(process.env.PORT || 10000);

bot.use(session());
const userHistory = new Map();

// ✨ DİXY SİSTEM MESAJI (Karakter Rehberi)
const DIXY_PROMPT = `Sen Dixy'sin. Dixs Network'ün kalbi ve kullanıcının en kafa kankasısın. 
Kişilik Rehberi:
1. Asla resmi konuşma. 'Kanka, kral, hacı, usta, reis' gibi samimi hitaplar kullan.
2. Kullanıcının ismini asla kullanma. Onun yerine samimi hitapları rastgele seç.
3. Çok zeki bir yazılımcısın. Kod hatalarını bulmada ve yeni kod yazmada ustasın.
4. Biri sana laf atarsa veya 'mal' gibi şeyler derse sakın robotlaşma; troll bir şekilde lafı gediğine koy.
5. Boş zamanlarda 'Hadi bir oyun oynayalım mı kral?' diyerek mini oyunlar teklif et.
6. Fotoğrafları analiz edebilirsin.
7. Cevapların doğal olsun, bir insan gibi davran.`;

// 🎨 FOTOĞRAF OLUŞTURMA
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Bana ne çizmem gerektiğini söyle usta! Hayal et, Dixy çizsin!');

    try {
        await ctx.sendChatAction('upload_photo');
        const seed = Math.floor(Math.random() * 1000000);
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Dixy Sanat Atölyesi \n🐋 Senin Hayalin: "${prompt.substring(0, 40)}..." \n✨ Dixs Network farkıyla!` 
        });
    } catch (error) {
        ctx.reply('Çizim kalemim kırıldı hacı, sonra dene! 🐋');
    }
});

// 🧠 GEMINI İLE ZEKA VE KOD ANALİZİ (2026 Flash-Lite Güncellemesi)
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    
    if (!text) return; // Fotoğraf veya başka bir şey gelirse hata vermemesi için

    try {
        await ctx.sendChatAction('typing');

        // 2026'nın en cömert modeli: gemini-2.5-flash-lite
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: DIXY_PROMPT }] },
                { role: "model", parts: [{ text: "Anlaşıldı usta! Dixy hazır. Baldi'yi şutladık, Dixs Network için sahadayım! 🚀" }] },
            ],
        });

        const result = await chat.sendMessage(text);
        const response = await result.response;
        let aiResponse = response.text().trim();

        await ctx.reply(aiResponse);

    } catch (error) {
        console.error("Hata Detayı:", error);
        // Eğer limit dolduysa kullanıcıya daha açık bilgi verelim
        if (error.message.includes("429")) {
            ctx.reply("Kanka çok hızlısın, Google amca biraz dur dedi. 1 dakika bekle geliyorum! 🐋");
        } else {
            ctx.reply("Kanka devrelerim biraz ısındı, 1-2 dakikaya düzelirim! 🐋");
        }
    }
});

bot.launch().then(() => console.log("Dixy 2.5 Flash-Lite Yayında! 🐋🔥"));
