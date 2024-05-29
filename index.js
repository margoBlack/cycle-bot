import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';
import { getRecordsOptions } from './helper/getRecordsOptions.js';
import { keyboardGenerator } from './helper/keyboardGenerator.js'

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

const allRecords = new Set();

const scheduleOptions = [
    { value: "monday", label: "Понеділок 20:00" },
    { value: "tuesday", label: "Вівторок 19:00" },
    { value: "wednesday", label: "Середа 20:00" },
    { value: "thursday", label: "Четверг 19:00" },
    { value: "friday", label: "Пʼятниця 20:00" },
    { value: "all_records", label: "Показати мої записи"}
];

const backKeyboard = new InlineKeyboard()
    .text('< Повернутись до меню', 'back');

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
        reply_markup: keyboardGenerator(scheduleOptions)
    });
});

bot.callbackQuery('all_records', async (ctx) => {
    const scheduleOptionsText = [...allRecords].length ? 'Ви записані на ->' : 'Наразі записів не знайдено'; 
    await ctx.callbackQuery.message.editText(`${scheduleOptionsText}`, {
        reply_markup: [...allRecords].length ? keyboardGenerator(getRecordsOptions(scheduleOptions, allRecords)) : backKeyboard,
    });
})

bot.callbackQuery(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], async (ctx) => {
    allRecords.add(ctx.callbackQuery.data);
    await ctx.callbackQuery.message.editText(`Ви записались на ${ctx.callbackQuery.data}`, {
        reply_markup: backKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('back', async (ctx) => {
    await ctx.callbackQuery.message.editText('Обери день для запису', {
        reply_markup: keyboardGenerator(scheduleOptions),
    });
    await ctx.answerCallbackQuery();
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