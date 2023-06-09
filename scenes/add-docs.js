////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages	  	  }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });
const 	Scene 				= require('telegraf/scenes/base');
const	scene_add_docs	 	= new Scene(name);





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена сбора данных по документам о собственности

scene_add_docs.enter(ctx => {

	let q = {

		egrn:  `Напишите, пожалуйста, когда Вы зарегистрировали собтсвенность в ЕГРН:`,
		pdkp:  `Напишите, пожалуйста, когда Вы подписали свой предварительный договор купли-продажи (ПДКП):`,
		dkp:   `Напишите, пожалуйста, когда Вы подписали свой договор купли-продажи (ДКП):`,
		ddu:   `Напишите, пожалуйста, когда Вы подписали свой договор долевого участия (ДДК):`,
		app:   `Напишите, пожалуйста, когда Вы подписали свой акт приема-передачи (АПП):`,
		why:   `Ок! учтём!`,
		other: `Напишите, ваше основание для возникновения собственност и дату, с которой это основание действует:`
	}

	return ctx.reply(q[ctx.session.doc.type]).then(() => {

		if (ctx.session.doc.type == 'why') return ctx.scene.leave();
	});
});

scene_add_docs.on('message', ctx => {

	let data = ctx.session.doc;
	if (!data) return ctx.scene.leave();

	let text = ctx.update.message.text;
	return ctx.db.insert("docs", {

		user: ctx.user._rid,
		user_id: ctx.user.id,
		type: data.type,
		answer: text
	})
	.then(() => ctx.reply(`Принято.`))
	.catch(trace.error(ctx.user, {scene: 'add-docs', session: ctx.session}))
	.then(() => ctx.reply(BOT_QUIZ[4].msg, BOT_QUIZ[4].extra))
	.catch(trace.error(ctx.user, {scene: 'add-docs', session: ctx.session}))
	.then(() => ctx.scene.leave());
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = scene_add_docs