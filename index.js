import 'dotenv/config';
import {Bot, InlineKeyboard, webhookCallback} from 'grammy';
import { hydrate } from '@grammyjs/hydrate';
import { getRecordsOptions } from './helper/getRecordsOptions.js';
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

const allRecords = new Set();

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

const newRecordKeyboard = new InlineKeyboard()
    .text('➕ Додати новий запис', 'back');

const menuKeyboard = new InlineKeyboard()
    .text('📍 Повернутись до меню', 'back');

const removeKeyboard = new InlineKeyboard()
    .text('🗑 Видалити запис', 'remove').row()
    .text('📍 Повернутись до меню', 'back');

bot.on('message').filter((ctx) => {
    return ctx.msg.chat?.username === "Ad_Impossibilia_Nemo_Obligatur" && ctx.msg.text === 'add_days'
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

    await ctx.reply(nextDates.toString())
    await ctx.reply(`💓💓💓💓💓`)
})

bot.on('message').filter((ctx) => {
    return ctx.msg.chat?.username === "Ad_Impossibilia_Nemo_Obligatur" && ctx.msg.text === 'get_schedule'
}, async (ctx) => {
    const now = new Date()
    const trainingsRef = collection(db, 'trainings');
    const querySnap = await getDocs(query(trainingsRef, where("date", ">=", now)))
    let msg = ''
    querySnap.forEach(training => {
        const count = training.data().participants.reduce((acc, p) =>
             acc +( p.status === 'signed' ? 1: 0), 0)
        msg += `${training.data().label} ${count}/${MAX_PARTICIPANTS} \n\n`
        msg += training.data().participants.map((p) => `${p.name} | ${p.status} \n`)
    })

    await ctx.reply(msg)
})

// For buttons with trainings
bot.on("callback_query:data").filter(ctx => ctx.callbackQuery.data.startsWith('$'), async (ctx) => {
    const trainingId = ctx.callbackQuery.data.slice(1)
    const userId = ctx.msg.chat.id.toString()
    const trainingRef = doc(db, 'trainings', trainingId);
    const userRef = doc(db, 'users', userId);
    const user = (await getDoc(userRef)).data()

    const training = (await getDoc(trainingRef)).data()

    if(training.participants.some(({id}) =>id===userId)) {
        ctx.reply('Ви ВЖЕ записані')
    }else {
        updateDoc(trainingRef, {participants: arrayUnion({status: 'signed', id: userId, name: user.name})})
        ctx.reply('Ви були записані')
    }

    // await ctx.answerCallbackQuery(); // remove loading animation
});

bot.command('start').filter((ctx) => {
    return ctx.msg.chat?.username === "Ad_Impossibilia_Nemo_Obligatu" //"jullibondarenko"
}, async (ctx) => {
    await ctx.reply(`Привіт, ${ctx.msg.chat?.first_name}!`)
})

bot.command('start', async (ctx) => {
    const userId = ctx.msg.from.id.toString()
    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, {id: ctx.msg.from.id, name: ctx.msg.chat?.first_name})

    await ctx.reply(`Привіт, <b>${ctx.msg.chat?.first_name}</b>!\n\nДля запису напишіть Ваше <i>імʼя</i>.`, {
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
    console.log(options)
    await ctx.reply('Для запису <i>оберіть</i> та <u>натисніть</u> на відповідний день із списку: ', {
        parse_mode: 'HTML',
        reply_markup: keyboardGenerator(options)
    });
});

bot.callbackQuery('all_records', async (ctx) => {
    const scheduleOptionsText = [...allRecords].length
        ? 'Аби <b>видалити</b> свій запис, натисніть на відовідну кнопку.\n\n<i>Ви записані на:</i> '
        : 'Наразі записів не знайдено 😕';
    await ctx.callbackQuery.message.editText(`${scheduleOptionsText}`, {
        parse_mode: 'HTML',
        reply_markup: [...allRecords].length ? keyboardGenerator(getRecordsOptions(scheduleOptions, allRecords, 'remove')) : newRecordKeyboard,
    });
})

bot.callbackQuery(['monday_remove', 'tuesday_remove', 'wednesday_remove', 'thursday_remove', 'friday_remove'], async (ctx) => {
    console.log(ctx.callbackQuery.data);
    await ctx.callbackQuery.message.editText(`
    Аби видалити запис на <b>${ctx.callbackQuery.data}</b>, натисніть відповідну кнопку.\n\n
ВАЖЛИВО: <i>Якщо Ви хочете видалити запис менш ніж за <u>24 години</u>, ваш статус буде змінено на <b>"В процесі"</b>.
Після успішного пошуку людини на місце, Вам прийде повідомленно про зміну статусу - <b>"Видалено"</b>.</i>\n
<b>У іншому випадку Ви маєте сплатити компенсацію у розмірі одного заняття <u>250грн</u>.</b>
    `, {
        parse_mode: 'HTML',
        reply_markup: removeKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('remove', async (ctx) => {
    await ctx.callbackQuery.message.editText(`
Статус вашого запиту на видалення запису - <code>"В процесі"</code>.
    `, {
        parse_mode: 'HTML',
        reply_markup: menuKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], async (ctx) => {
    allRecords.add(ctx.callbackQuery.data);
    const userId = ctx.msg.from.id.toString();
    const userRef = doc(db, 'users', userId);
    const userTrainingsRef = collection(db, 'users', userId, 'trainings');
    const userData = (await getDoc(userRef)).data();
    console.log('userData', userData);
    await addDoc(userTrainingsRef, {date: ctx.callbackQuery.data, status: 'signed'});
    // await updateDoc(userRef, {})
    await ctx.callbackQuery.message.editText(`<b>Дякую за запис!</b>\n\nВи записались на <u>${ctx.callbackQuery.data}</u>.`, {
        parse_mode: 'HTML',
        reply_markup: newRecordKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('back', async (ctx) => {
    await ctx.callbackQuery.message.editText(`Для запису <i>оберіть</i> та <u>натисніть</u> на відповідний день із списку:`, {
        parse_mode: 'HTML',
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

export const startBot = functions.https.onRequest(webhookCallback(bot));