# How to run functions

https://grammy.dev/hosting/firebase

instead of localtunnel, install Ngrok

run:  
`npm run serve`  
to run functions locally   
and then run  
`ngrok http http://localhost:5001`  
so API will be visible on the net  

link like https://e00a-31-144-77-141.ngrok-free.app (Forwarding section)
should be placed instead of <SERVER> in next line

https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<SERVER>/<PROJECT_NAME>/<REGION>/<FUNCTION_NAME>

https://api.telegram.org/bot7471653990:AAEJex2kAZD7_B58-l2sH6LxLux3tjPufUI/setWebhook?url=https://2b79-128-124-4-40.ngrok-free.app/cycle-bot-997b0/us-central1/startBot

[EXAMPLE]: https://api.telegram.org/bot7142217348:AAGQLNuUVf9K2O_EkZLsFKRmo05QvoApxT4/setWebhook?url=https://c91f-31-144-77-141.ngrok-free.app/cycle-demo-88638/us-central1/startBot
this line can be executed in browser, it's needed for setting webhook  
  
when app will be deployed, link should be replased