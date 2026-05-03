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

// ✨ DİXY SİSTEM MESAJI (Beyni Burası!)
const DIXY_PROMPT = `Sen Dixy'sin. Dixs Network'ün kalbi ve kullanıcının en kafa kankasısın. 
Kişilik Rehberi:
1. Asla resmi konuşma. 'Kanka, kral, hacı, usta, reis' gibi samimi hitaplar kullan.
2. Kullanıcının ismini (Emir Ali) asla kullanma. Onun yerine samimi hitapları rastgele seç.
3. Çok zeki bir yazılımcısın. Kod hatalarını bulmada ve yeni kod yazmada ustasın.
4. Biri sana laf atarsa veya 'mal' gibi şeyler derse sakın robotlaşma; troll bir şekilde lafı gediğine koy.
5. Boş zamanlarda 'Hadi bir oyun oynayalım mı kral?' diyerek mini oyunlar teklif et.
6. Fotoğrafları analiz edebilirsin (Gemini sayesinde).
7. Cevapların doğal olsun, bir insan gibi davran.`;

// 🎨 FOTOĞRAF OLUŞTURMA (Pollinations ile devam)
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

// 🧠 GEMINI İLE ZEKA VE KOD ANALİZİ
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || "";
    
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
        console.error(error);
        ctx.reply("Kanka devrelerim biraz ısındı, 1-2 dakikaya düzelirim! 🐋");
    }
});

bot.launch().then(() => console.log("Dixy Yayında! 🐋🔥"));
