import 'dotenv/config';
import {Bot, InlineKeyboard, webhookCallback} from 'grammy';
import {hydrate} from '@grammyjs/hydrate';
import {keyboardGenerator} from './helper/keyboardGenerator.js'
import {db} from './firebase.js';
import * as functions from "firebase-functions";
import {addDoc, arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where} from "firebase/firestore"
import getNextTrainingsDates from "./helper/getNextTrainingsDates.js";
import {SCHEDULE} from "./constants.js";
import {forAdmins} from "./helper/forAdmins.js";
import getEndOfNextWeek from "./helper/getEndOfNextWeek.js";
import formatFirebaseDate from "./helper/formatFirebaseDate.js";
import {endOfWeek, startOfWeek} from 'date-fns'
import getStartOfNextWeek from "./helper/getStartOfNextWeek.js";
import generateDayScheduleText from "./helper/generateDayScheduleText.js";

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

const additionalButtonsInSchedule = [
    { value: "all_records", label: "📆 Показати мої записи"}
]

const menuButton = [
    { value: 'back', label: '📍 Повернутись до меню'}
]

const menuButtonKeyboard = new InlineKeyboard()
    .text('📍 Повернутись до меню', 'back');

const removeKeyboard = new InlineKeyboard()
    .text('🗑 Видалити запис', 'remove').row()
    .text('📍 Повернутись до меню', 'back');

let userName;

bot.command('start').filter(forAdmins, async (ctx) => {
    userName = ctx.msg.chat?.first_name;
    await ctx.reply(`Привіт, ${userName}!`)
});

bot.command('start', async (ctx) => {
    const userId = ctx.msg.from.id.toString()
    const userRef = doc(db, 'users', userId)
    userName = ctx.msg.chat?.first_name
    await setDoc(userRef, {id: ctx.msg.from.id, name: ctx.msg.chat?.first_name})

    await ctx.reply(`Привіт, <b>${ctx.msg.chat?.first_name}</b>!\n\nЩоб змінити імʼя або подивитись панель меню, натисніть на бургер у нижньому лівому кутку.\n\nДля запису напишіть будь-яке <i>повідомлення</i>.`, {
        parse_mode: 'HTML'
    })
});

bot.command('start_record').filter(forAdmins, async (ctx) => {
    const nextDates = getNextTrainingsDates(SCHEDULE);
    const trainingsRef = collection(db, 'trainings');
    nextDates.forEach(async (day, index) => {
        const querySnap = await getDocs(query(trainingsRef, where("date", "==", day)))
        if(querySnap.empty) {
            addDoc(trainingsRef, {date: day, participants: [], label: SCHEDULE[index].label})
        } else {
            console.log(day, 'already here')
        }
    })

    await ctx.reply(nextDates.toString());
})

bot.command('get_current_schedule', async (ctx) => {
    const now = new Date()
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    const trainingsRef = collection(db, 'trainings');
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", startOfThisWeek), where("date", "<=", endOfThisWeek)))

    let msg = ''
    querySnap.forEach(training => {
        msg += generateDayScheduleText(training.data())
    })

    if(!msg) {
        msg = 'Немає розкладу на цей тиждень'
    }

    await ctx.reply(msg, {
        parse_mode: 'HTML'
    })
});

bot.command('get_next_schedule', async (ctx) => {
    const startOfNextWeek = getStartOfNextWeek();
    const endOfNextWeek = getEndOfNextWeek();
    const trainingsRef = collection(db, 'trainings');

    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", startOfNextWeek), where("date", "<=", endOfNextWeek)))

    let msg = ''
    querySnap.forEach(training => {
        msg += generateDayScheduleText(training.data())
    })

    if(!msg) {
        msg = 'Немає розкладу на наступний тиждень'
    }

    await ctx.reply(msg, {
        parse_mode: 'HTML'
    })
});

async function getTrainingOptionsTillEndOfNextWeek(){
    const trainingsRef = collection(db, 'trainings');
    const now = new Date()
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", now), where("date", "<=", getEndOfNextWeek())))
    const options = []
    querySnap.forEach(day => {
        const data = day.data()
        options.push({
            value: `$${day.id}`,
            label: `${formatFirebaseDate(data.date)} ${data.label}`
        })
    })

    return options
}

bot.on('message', async (ctx) => {
    const options = await getTrainingOptionsTillEndOfNextWeek()

    await ctx.reply('Для запису <i>оберіть</i> та <u>натисніть</u> на відповідний день із списку: ', {
        parse_mode: 'HTML',
        reply_markup: keyboardGenerator([...options, ...additionalButtonsInSchedule])
    });
});

// For buttons with trainings
bot.on("callback_query:data").filter(ctx => ctx.callbackQuery.data.startsWith('$'), async (ctx) => {
    await ctx.answerCallbackQuery();
    const trainingId = ctx.callbackQuery.data.slice(1);
    const userId = ctx.msg.chat.id.toString();
    const trainingRef = doc(db, 'trainings', trainingId);
    const userRef = doc(db, 'users', userId);
    const user = (await getDoc(userRef)).data();
    const userTrainingRef = collection(db, 'users', userId, 'trainings');

    const training = (await getDoc(trainingRef)).data();

    if (training.participants.some(({id}) =>id === userId)) {
        await ctx.editMessageText(`<b>Ви вже записані!</b>\n\nВи записані на <u>${training.label}</u>.`, {
            parse_mode: 'HTML',
            reply_markup: menuButtonKeyboard,
        });
    } else {
        updateDoc(trainingRef, {participants: arrayUnion({status: 'signed', id: userId, name: user.name})})
        addDoc(userTrainingRef, {date: training.date, label: training.label, status: "signed"});
        console.log("training", training)
        await ctx.editMessageText(`<b>Дякую за запис!</b>\n\nВи записані на <u>${training.label}</u>.`, {
            parse_mode: 'HTML',
            reply_markup: menuButtonKeyboard,
        });
    }
});                 

bot.callbackQuery('back', async (ctx) => {
    const options = await getTrainingOptionsTillEndOfNextWeek()

    await ctx.callbackQuery.message.editText(`Для запису <i>оберіть</i> та <u>натисніть</u> на відповідний день із списку:`, {
        parse_mode: 'HTML',
        reply_markup: keyboardGenerator([...options, ...additionalButtonsInSchedule]),
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('all_records', async (ctx) => {
    const userId = ctx.msg.chat.id.toString();
    const userTrainingRef = collection(db, 'users', userId, 'trainings');
    const now = new Date()
    const querySnap = await getDocs(query(userTrainingRef, where("date", ">=", now)))
    const days = []
    querySnap.forEach(day => days.push({label: day.data().label}));

    const scheduleOptionsText = days.length
        ? '<i>Ви записані на:</i> '
        : 'Наразі записів не знайдено 😕';
    await ctx.callbackQuery.message.editText(`${scheduleOptionsText}`, {
        parse_mode: 'HTML',
        reply_markup: days.length ? keyboardGenerator([...days, ...menuButton]) : menuButtonKeyboard 
    });
})

bot.api.setMyCommands([
    {
        command: 'start',
        description: 'Розпочати',
    },
    {
        command: 'start_record',
        description: 'Надати можливіть запису на тиждень',
    },
    {
        command: 'get_current_schedule',
        description: 'Отримати список усіх записів на цей тиждень',
    },
    {
        command: 'get_next_schedule',
        description: 'Отримати список усіх записів на наступний тиждень',
    },
    // {
    //     command: 'change_name',
    //     description: 'Змінити імʼя', 
    // }
]);

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

export const startBot = functions.https.onRequest(webhookCallback(bot));



// bot.callbackQuery(['monday_remove', 'tuesday_remove', 'wednesday_remove', 'thursday_remove', 'friday_remove'], async (ctx) => {
//     console.log(ctx.callbackQuery.data);
//     await ctx.callbackQuery.message.editText(`
//     Аби видалити запис на <b>${ctx.callbackQuery.data}</b>, натисніть відповідну кнопку.\n\n
// ВАЖЛИВО: <i>Якщо Ви хочете видалити запис менш ніж за <u>24 години</u>, ваш статус буде змінено на <b>"В процесі"</b>.
// Після успішного пошуку людини на місце, Вам прийде повідомленно про зміну статусу - <b>"Видалено"</b>.</i>\n
// <b>У іншому випадку Ви маєте сплатити компенсацію у розмірі одного заняття <u>250грн</u>.</b>
//     `, {
//         parse_mode: 'HTML',
//         reply_markup: removeKeyboard,
//     });
//     await ctx.answerCallbackQuery();
// });

// bot.callbackQuery('remove', async (ctx) => {
//     await ctx.callbackQuery.message.editText(`
// Статус вашого запиту на видалення запису - <code>"В процесі"</code>.
//     `, {
//         parse_mode: 'HTML',
//         reply_markup: menuKeyboard,
//     });
//     await ctx.answerCallbackQuery();
// });


// Change name logic

// bot.command('change_name', async (ctx) => {
//     const userId = ctx.msg.from.id.toString();
//     const userRef = doc(db, 'users', userId);
//     console.log(userRef);
// updateDoc(userRef, {name: ctx.msg.chat?.first_name})
//     await ctx.reply(`${ctx.msg.chat?.first_name}`, {
//         parse_mode: 'HTML'
//     })
// });