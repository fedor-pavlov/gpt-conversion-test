////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages	  	  }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });
const 	Scene 				= require('telegraf/scenes/base');
const	scene_reply		 	= new Scene(name);





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена проверки регистрационных данных

scene_reply.enter(ctx => {

	if (ctx.session.reply && ctx.session.reply.sender && ctx.session.reply.chat) {

		ctx.session.reply.responder = ctx.from;
		trace.info('WAITING FOR REPLY TO USER', ctx.session.reply);
		return ctx.reply(`Пожалуйста, введите текст вашего ответа пользователю ${JSON.stringify(ctx.session.reply.sender)} или команду /cancel:`);
	}

	else {

		trace.info('INCORRECT REPLY SESSION', {session: ctx.session}, {update: ctx.update});
		return ctx.reply(`Некорректные данные в reply-сессии: ${ctx.session}`);
	}
});

scene_reply.command("/cancel", ctx => {

	ctx.reply("Ok.");
	ctx.scene.leave();
});

scene_reply.on('message', (ctx, next) => {

	let data = ctx.session.reply;
	if (data && data.responder.id === ctx.from.id) {

		ctx.scene.leave();

		return ctx.telegram.sendMessage(data.chat.id, ctx.update.message.text).then(() => {

			trace.info("REPLY IS SENT [SUCCESS]", {to: data}, {msg: ctx.update.message.text});
			return ctx.replyWithHTML(`<b>Ответ отправлен</b>\nтекст: <i>${ctx.update.message.text}</i>\nкому: <i>${JSON.stringify(data.sender, null, "\t")}</i>`).catch(err => { return ctx.reply(`Ответ отправлен\n(err = ${err.message})`) });
		})
		.catch(err => {

			trace.info("REPLY FAILURE", err, {to: data}, {msg: ctx.update.message});
			ctx.scene.leave();
			return ctx.reply(`Произошла ошибка во время отправки ответа: ${err.message}`);
		});
	}

	return next(ctx);
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = scene_reply