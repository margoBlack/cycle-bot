require('dotenv').config();
const { Bot, Keyboard } = require('grammy');

const bot = new Bot(process.env.BOT_API_KEY);

bot.command('start').filter((ctx) => {
    return ctx.msg.chat?.username === "Ad_Impossibilia_Nemo_Obligatur" //"jullibondarenko"
}, async (ctx) => {
    await ctx.reply(`Привіт, ${ctx.msg.chat?.first_name}`)
})

bot.command('start', async (ctx) => {
    await ctx.reply(`Привіт, <b>${ctx.msg.chat?.first_name}</b>!`, {
        parse_mode: 'HTML'
    })
});

bot.on('message', async (ctx) => {
    const scheduleLabels = ["Понеділок 20:00", "Вівторок 19:00", "Середа 20:00", "Четверг 19:00", "Пʼятниця 20:00"];
    const scheduleOptions = scheduleLabels.map((label) => {
        return [
            Keyboard.text(label)
        ]
    });
    const scheduleKeyboard = Keyboard.from(scheduleOptions).resized().oneTime();
    
    await ctx.reply('Обери день для запису', {
        reply_markup: scheduleKeyboard
    });
});

//Error handlers
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });

bot.start();