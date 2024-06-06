import 'dotenv/config';
import {Bot, InlineKeyboard, webhookCallback} from 'grammy';
import { hydrate } from '@grammyjs/hydrate';
import { keyboardGenerator } from './helper/keyboardGenerator.js'
import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";
import * as functions from "firebase-functions";
import {doc,collection, setDoc, getDoc, updateDoc, addDoc, getDocs, query, where, arrayUnion} from "firebase/firestore"
import getNextTrainingsDates from "./helper/getNextTrainingsDates.js";


const firebaseConfig = {
    apiKey: "AIzaSyA4BtOR_2xBX6vmuqES5a6qVfwfp3M3Cwo",
    apiKey: "AIzaSyA4BtOR_2xBX6vmuqES5a6qVfwfp3M3Cwo",
    authDomain: "cycle-bot-997b0.firebaseapp.com",
    projectId: "cycle-bot-997b0",
    storageBucket: "cycle-bot-997b0.appspot.com",
    messagingSenderId: "748030380319",
    appId: "1:748030380319:web:83e0d7c7aa35bac646c82a"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

const MAX_PARTICIPANTS = 8
const schedule = [
    {  day: 'Monday', time: '20:00', label: "Понеділок 20:00" },
    {  day: 'Tuesday', time: '19:00', label: "Вівторок 19:00" },
    {  day: 'Wednesday', time: '20:00', label: "Середа 20:00" },
    {  day: 'Thursday', time: '19:00', label: "Четвер 19:00" },
    {  day: 'Friday', time: '20:00', label: "Пʼятниця 20:00" },
]

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

bot.command('start').filter((ctx) => {
    return ctx.msg.chat?.username === "Ad_Impossibilia_Nemo_Obligatu" //"jullibondarenko"
}, async (ctx) => {
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

bot.command('start_record').filter((ctx) => {
    return ctx.msg.chat?.username === "jullibondarenko"
}, async (ctx) => {
    const nextDates = getNextTrainingsDates(schedule);
    const trainingsRef = collection(db, 'trainings');
    nextDates.forEach(async (day, index) => {
        const querySnap = await getDocs(query(trainingsRef, where("date", "==", day)))
        if(querySnap.empty) {
            addDoc(trainingsRef, {date: day, participants: [], label: schedule[index].label})
        } else {
            console.log(day, 'already here')
        }
    })

    await ctx.reply(nextDates.toString());
})

bot.command('get_schedule', async (ctx) => {
    const now = new Date()
    const trainingsRef = collection(db, 'trainings');
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", now)))
    let msg = ''
    querySnap.forEach(training => {
        const count = training.data().participants.reduce((acc, p) =>
             acc +( p.status === 'signed' ? 1: 0), 0)
        msg += `<b><u>${training.data().label}</u></b> <i>${count}/${MAX_PARTICIPANTS}</i>\n\n`
        msg += training.data().participants.map((p) => `${p.name} | ${p.status} \n\n`)
    })

    await ctx.reply(msg, {
        parse_mode: 'HTML'
    })
});

bot.on('message', async (ctx) => {
    const trainingsRef = collection(db, 'trainings');
    const now = new Date()
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", now)))
    const options = []
    querySnap.forEach(day => {
        const data = day.data()
        options.push({
            value: '$'+day.id,
            label: data.label
        })
    })

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
    const trainingsRef = collection(db, 'trainings');
    const now = new Date()
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", now)))
    const options = []
    querySnap.forEach(day => {
        const data = day.data()
        options.push({
            value: '$'+day.id,
            label: data.label
        })
    })
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
        command: 'get_schedule',
        description: 'Отримати список усіх записів на тиждень', 
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