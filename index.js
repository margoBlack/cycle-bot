require('dotenv').config();
const { Bot, Keyboard, InlineKeyboard } = require('grammy');
const { hydrate } = require('@grammyjs/hydrate');

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

const scheduleKeyboard = new InlineKeyboard()
    .text("Понеділок 20:00", "monday").row()
    .text("Вівторок 19:00", "tuesday").row()
    .text("Середа 20:00", "wednesday").row()
    .text("Четверг 19:00", "thursday").row()
    .text("Пʼятниця 20:00", "friday").row()
    .text('Показати мої записи', 'all_records');
const backKeyboard = new InlineKeyboard()
    .text('< Повернутись до меню', 'back');
const recordedList = new Set();

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
    await ctx.reply('Обери день для запису', {
        reply_markup: scheduleKeyboard
    });
});

bot.callbackQuery('all_records', async (ctx) => {
    const scheduleOptionsText = [...recordedList] ? `Ви записані на ${[...recordedList]}` : 'Наразі записів не знайдено'; 
    await ctx.callbackQuery.message.editText(`${scheduleOptionsText}`, {
        reply_markup: backKeyboard,
    });
})

bot.callbackQuery(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], async (ctx) => {
    recordedList.add(ctx.callbackQuery.data);
    console.log(recordedList);
    await ctx.callbackQuery.message.editText(`Ви записались на ${ctx.callbackQuery.data}`, {
        reply_markup: backKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('back', async (ctx) => {
    await ctx.callbackQuery.message.editText('Обери день для запису', {
        reply_markup: scheduleKeyboard,
    });
    await ctx.answerCallbackQuery();
});

// bot.on('callback_query:data', async (ctx) => {
//     await ctx.answerCallbackQuery();
//     console.log(ctx.callbackQuery.message.reply_markup.inline_keyboard.text);
//     await ctx.reply(`Ви записались на ${ctx.callbackQuery.data}`);
// });

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