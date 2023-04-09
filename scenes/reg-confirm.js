////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages,
		decode_callback	  }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });
const 	Scene 				= require('telegraf/scenes/base');
const	scene_reg_confirm 	= new Scene(name);
const	Markup				= require('telegraf/markup');





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена подтверждения ввода регистрационных данных

scene_reg_confirm.enter(ctx => {

	if (ctx.session.reg.id > 0) {

		ctx.reply(`Кв. ${ctx.session.reg.id} - это ваша квартира? Зарегистрировать её за вами?`, Markup.inlineKeyboard([
				 Markup.callbackButton('✖️нет', 'reg-cancel')
				,Markup.callbackButton('✅ да', 'reg-confirm')
		]).extra());
	}
	else {

		trace.info("SCENE [reg-confirm]: ctx session doesn't contain appartment number!", ctx.session, ctx.user);
		ctx.scene.leave();
	}
});

scene_reg_confirm.on('callback_query', (ctx, next) => {

	ctx.editMessageReplyMarkup();
	ctx.answerCbQuery();
	return next(ctx)
});

scene_reg_confirm.action('reg-cancel', ctx => {

	ctx.reply('Ok.');
	ctx.scene.leave();
});

scene_reg_confirm.action('reg-confirm', ctx => {

	ctx.scene.enter('reg-verify');
});

scene_reg_confirm.use(ctx => {

	trace.info('UNEXPECTED_INPUT_AT_REG_CONFIRM', ctx.update, ctx.user);
	ctx.scene.leave();
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = scene_reg_confirm