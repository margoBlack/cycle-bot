import { InlineKeyboard } from 'grammy';

export const keyboardGenerator = (options) => {
    const keyboard = new InlineKeyboard()
    options.forEach((option, index) => {
        keyboard.text(option.label, option.value)
        if(index <= options.length -1) {
            keyboard.row()
        }
    })
   return keyboard
}