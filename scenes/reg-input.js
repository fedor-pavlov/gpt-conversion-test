////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages	  	  }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });
const 	Scene 				= require('telegraf/scenes/base');
const	scene_reg_input 	= new Scene(name);

const REX_APPT	= /^(1\d\d\d|\d{1,3})$/i;
const REX_APP2	= /\b(9[123]\d\d|1\d\d\d|\d{1,3})\b/gi;





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена запроса на ввод регистрационных данных

scene_reg_input.enter(ctx => {

	ctx.session.reg = { attempt: 0, id: null };
	ctx.reply('Пожалуйста, введите номер вашей квартиры:');
});

scene_reg_input.hears(REX_APP2, ctx => {

	ctx.session.reg.id = ctx.message.text;
	ctx.scene.enter('reg-confirm');
});

scene_reg_input.on('message', ctx => {

	ctx.session.reg.attempt++;
	if (ctx.session.reg.attempt >= 3) {

		ctx.scene.leave();
		return ctx.reply('Окей, проехали. В следующий раз у Вас обязательно получится!');
	}
	else {

		trace.error('input is not an appartment number', ctx.message.text);
		return ctx.reply(`Хммм... вот это "${ctx.message.text}" - не похоже на номер квартиры, а я сейчас жду вас именно номер квартиры (мы же в процессе регистрации, верно?)`);
	} 
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = scene_reg_input