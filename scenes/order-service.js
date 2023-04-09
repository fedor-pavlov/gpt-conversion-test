////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages,
        actions,
        say               }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });

const 	WizardScene 		= require('telegraf/scenes/wizard');
const	Composer			= require('telegraf/composer');
const	stepInvitation		= new Composer();
const	stepBudget			= new Composer();





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена проверки регистрационных данных

function verifyRegistration(ctx) {

	if (!ctx.isPrivate) {

		return ctx.scene.leave();
	}

    ctx.session.order_service = {}

    return messages
        .order_service_invitation(ctx)
        .keyboard({})
        .reply()
        .then(() => ctx.wizard.next(), () => ctx.scene.leave());
}





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена приглашения к мытью окон

stepInvitation.action(actions.order_service_about, say('order_service_about'));

stepInvitation.action(actions.order_service_cancel, ctx => {

    delete ctx.session.order_service
	return ctx.reply("Ок, заявка отменена.").then(() => ctx.scene.leave()).then(() => ctx.editMessageReplyMarkup())
});

stepInvitation.on('message', ctx => {

    ctx.session.order_service.task = ctx.update.message.text
	return say('order_service_budget')(ctx).then(() => ctx.wizard.next(), () => ctx.scene.leave());
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена бюджетирования

stepBudget.action(actions.order_service_cancel, ctx => {

    delete ctx.session.order_service
	return ctx.reply("Ок, заявка отменена.").then(() => ctx.scene.leave()).then(() => ctx.editMessageReplyMarkup())
});

stepBudget.on('message', ctx => {

    ctx.session.order_service.budget = ctx.update.message.text
    ctx.session.order_service.user = ctx.user

    return Promise.all([

        messages.order_service_new_order(ctx).with(ctx.session.order_service).send(-1001259136005),
        messages.order_service_confirmation(ctx).say()
    ])
});

stepBudget.use(ctx => {

	return messages
		.wash_windows_budget_unknown(ctx)
		.keyboard({})
        .reply()
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = new WizardScene(name, null,
	verifyRegistration,
	stepInvitation,
	stepBudget);