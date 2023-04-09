////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const	TELEGRAF      		= require('telegraf');
const { SOURCE_ID,
		SOURCE_TITLE,
		CLASSES,
        SETTINGS        }   = require('./constants');
const { messages,
        actions,
        decode_callback,
        broadcast,
        say             }   = require('./speech');
const   stage               = require('./scenes');
const   session             = require('telegraf/session');
const   user_session        = require('./db/session');
const   trace               = require('../../tracer').create({ title: SOURCE_TITLE + '[MIDDLEWARE]', source: SOURCE_ID });
const { toString,
        access_card_id }    = require('../../tools');
const   support             = "@fedor_pavlov";
const 	Extra				= require('telegraf/extra');
const 	Markup				= require('telegraf/markup');
const { toText }            = require('object-to-text');
const   oUser               = require('./db/user')





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// OBSOLETE DEPENDCIES //////////////////////////////////////////////////////////////////////////////

const REX_APPT	= /^(1\d\d\d|\d{1,3})$/i;
const REX_APP2	= /\b(9[123]\d\d|1\d\d\d|\d{1,3})\b/gi;
const REX_THNX	= /^спасиб.*/i;
const REX_CONF	= /^\{"accept-doc":\{.+\}\}$/i;
const REX_RECV	= /^\{"recieve-money":\{.+\}\}$/i;
const REX_FILM	= /^\{"film":\{.+\}\}$/i;
const REX_RELS	= /^[1-9]\d{8}$/i;
const REX_ESTR	= /Христос\s*Воскрес/i;
const REX_MENU	= /^(\/\#\\)?(меню|menu)/i;

const USR_SUPP	= 771172117;
const USR_ZOTOV = 1*(process.env.USR_ZOTV ||  776914784);
const USR_NICKY = 1*(process.env.USR_NICK ||  52984194);
const CHT_LOGS	= 1*(process.env.CHT_LOGS || -338913683);
const CHT_ATTN	= 1*(process.env.CHT_ATTN || -1001214733932);
const CHT_PRIV	= 1*(process.env.CHT_PRIV || -1001372113776);
const CHT_LAWR	= -1001400315794;
const CHT_CASH	= 1*(process.env.CHT_CASH || -1001263903912);
const CHT_NEWS	= 1*(process.env.CHT_NEWS || -338797486);
const CHT_FILM	= -1001342517700;
const CHT_SYST	= [CHT_LOGS, CHT_ATTN, CHT_NEWS, CHT_CASH, CHT_FILM, -1001179410682];

const MAX_MSPS	= 15;
const TM_SLEEP	= 1000;
const TM_DELET	= 15000;
const MNY_SUMM	= 1000;
const MNY_DISP	= 6;

const BOT_QUIZ = {

	11:	{	msg: `<i>Прошу прощения, но я случайно стёр ваши ответы по 1-му и 2-му вопросам.\n\nПростите.\n\nЕсли не затруднит, ответьте на 1-й и 2-й вопросы еще раз, пожалуйста, используя кнопки под этим сообщением:</i>\n\n<b>Вопрос 1:</b>\nГолосовали ли Вы по первому собранию, которое проходило с 01.04 по 31.05?`,
			extra: Extra.HTML().markup(m => m.inlineKeyboard([
				[Markup.callbackButton("Да, голосовал",		`{"vote-fix":{"id":11,"answer":"yes"}}`)],
				[Markup.callbackButton("Нет, не голосовал",	`{"vote-fix":{"id":11,"answer":"no"}}`)],
			]))
		},
	12: {	msg: `<b>Вопрос 2:</b>\nГолосовали ли Вы по второму собранию, которое проходит сейчас, с 28.05 по 21.06?`,
			extra: Extra.HTML().markup(m => m.inlineKeyboard([

				[Markup.callbackButton("Да, уже",						`{"vote-fix":{"id":2,"answer":"yes"}}`)],
				[Markup.callbackButton("Нет, но до 21.06 ещё успею",	`{"vote-fix":{"id":2,"answer":"not yet"}}`)],
				[Markup.callbackButton("Нет, и не планирую",			`{"vote-fix":{"id":2,"answer":"no plans"}}`)],
				[Markup.callbackButton("Не знаю, как это сделать",		`{"vote-fix":{"id":2,"answer":"how"}}`)],
			]))
		},
	2:	{	msg: `<b>Вопрос 2 из 4:</b>\nГолосовали ли Вы по второму собранию, которое проходит сейчас, с 28.05 по 21.06?`,
			extra: Extra.HTML().markup(m => m.inlineKeyboard([

				[Markup.callbackButton("Да, уже",						`{"vote":{"id":2,"answer":"yes"}}`)],
				[Markup.callbackButton("Нет, но до 21.06 ещё успею",	`{"vote":{"id":2,"answer":"not yet"}}`)],
				[Markup.callbackButton("Нет, и не планирую",			`{"vote":{"id":2,"answer":"no plans"}}`)],
				[Markup.callbackButton("Не знаю, как это сделать",		`{"vote":{"id":2,"answer":"how"}}`)],
			]))
		},
	3:	{	msg: `<b>Вопрос 3 из 4:</b>\nКакого числа Вы подписали акт-приема передачи (или другое основание для собственности)?\n\n<i>Вопрос связан вот с чем:\nесли обнаруживается, что за Вас проголосовал застройщик, то для составления претензии надо иметь какое-либо обоснование, согласно которому застройщик не имел право этого делать. Например, Вы успели подписать АПП до 31-го мая - это хорошее основание для того, чтобы запретить застройщику голосовать за Вас.</i>`,
			extra: Extra.HTML().markup(m => m.inlineKeyboard([				

				[Markup.callbackButton("у меня подписан АПП",			`{"docs":{"type":"app"}}`)],
				[Markup.callbackButton("у меня есть ДКП",				`{"docs":{"type":"dkp"}}`)],
				[Markup.callbackButton("у меня есть только ПДКП",		`{"docs":{"type":"pdkp"}}`)],
				[Markup.callbackButton("у меня есть только ДДУ",		`{"docs":{"type":"ddu"}}`)],
				[Markup.callbackButton("у меня есть что-то получше",	`{"docs":{"type":"other"}}`)],
				[Markup.callbackButton("вообще не понятно о чем это",	`{"docs":{"type":"why"}}`)]
			]))
		},
	4:	{	msg: `<b>Вопрос 4 из 4:</b>\nКак ни странно, в голосовании участвуют не люди, а метры. На результат влияет общая площадь всей вашей собственности. В том числе парковки и кладовки. Если вы голосовали по квартире, то застройщик мог проголосовать, например, по вашей парковке.\n\nУкажите ваши доп.квартиры, кладовки и парковки, чтобы мы могли проверить, не воспользовалась ли УК вашими объектами для голосования по 1-му ОСС.`,
			extra: Extra.HTML().markup(m => m.inlineKeyboard([

				[Markup.callbackButton("добавить квартиру",	`{"prop":{"type":"apt"}}`)],
				[Markup.callbackButton("добавить кладовку",	`{"prop":{"type":"parking"}}`)],
				[Markup.callbackButton("добавить парковку",	`{"prop":{"type":"storage"}}`)]
			]))
		}
}


/*<b>Восточная башня</b>
<a href="https://t.me/joinchat/GCYOWEuq2ObEGdOa_0jVeA">ссылка на отдельный чат</a> - для жильцов Восточной башни.
*/



const BOT_MSG_RESOURCES = `<b>Пресня Сити - Официальный</b>
@PresnyaCityOfficial - общий чат соседей c представителями УК и застройщика

<b>Закрытый чат</b>
Только для подтвержденных собственников.
Вход через бота @PresnyaBot

<b>Канал "Всё по Делу"</b>
<a href="https://t.me/presnya_city_news">Открыть канал</a> - для тех, кто не хочет читать чаты, но хочет быть в курсе самых важных событий и полезной информации.

<b>Западная башня</b>
Отдельный чат для жильцов Западной башни. Напишите <a href="tg://user?id=779452436">Валентине</a>, админу этого чата, чтобы она вас в него добавила.

<b>Центральная башня</b>
<a href="https://t.me/joinchat/DeM53h1ysuCItx-uvCNxzA">ссылка на отдельный чат</a> для жильцов Центральной башни.

<b>Восточная башня</b>
<a href="https://t.me/joinchat/GCYOWEuq2ObEGdOa_0jVeA">ссылка на отдельный чат</a> - для жильцов Восточной башни.

<b>Рекомендации по поставщикам</b>
<a href="https://t.me/joinchat/LnWAFBSF0dErJXZaQNCZUA">ссылка на канал</a> - здесь собственники делятся рекомендациями и анти-рекомендациями по поставщикам, бригадам и т.д.
Чтобы добавить свою рекомендацию в этот канал, нужно написать личное сообщение <a href="tg://user?id=779452436">Валентине</a>

<b>Паркинг и кладовки</b>
@Psparking

<b>Лайфхаки</b>
@PresnyaCityLifehack - ответы на популярные вопросы (вызов БТИ, регистрация собственности)

<b>Отопление, кондиционирование и вентиляция</b>
@Kondeiotoplenie

<b>Дети</b>
@PresnyaCity_Kids
‍
<b>Котопёс</b>
@Presnyacity_Kotopes

<b>NightOut</b>
@PresnyaCityNightOut

<b>Про еду</b>
@PresnyaZhratva

<b>Барахолка</b>
@presnyacitybaraholka - купить/продать/обменять любую вещь

<b>Юрист</b>
Отдельный чат тех, кто скинулся на юриста.
Если вы тоже хотите скинуться на юриста - то это можно сделать в чат-боте @PresnyaBot
`;





const BOT_MSG_VOTE1 = `<b>Осталось 2 дня</b>, чтобы проголосовать за внедрение проекта "Активный Гражданин" в ЖК Пресня Сити. Буквально сегодня и завтра.

<b>Что такое "Активный Гражданин"?</b>
Это проект мэрии г.Москвы https://ag.mos.ru - официальная городская площадка для электронных голосований.
Её можно использовать для проведения общих собраний и голосований жителей нашего дома.
Но для этого надо один раз проголосовать за выбор этой системы на общем собрании собственников - старым бумажным способом.

<b>Зачем это нужно?</b>
Вот пример:
В скором времени мы начнем платить 18 рублей с кв.метра (800-1600 рублей с квартиры в месяц) отчислений в фонд капитального ремонта.
Это 21 миллион рублей в год. По умолчанию, эти деньги уйдут на общий городской счет и на них будут ремонтироваться пятиэтажки, пока наш дом ждет своей очереди.
Но можно создать отдельный спец.счет нашего дома и аккумулировать деньги на нём, чтобы они не ушли на другие дома.
И для этого надо запустить общее собрание собственников, проголосовать и собрать кворум (более половины голосов, а по некоторых случаях 2/3 голосов).
Как показала практика, <b>в доме на 1500 квартир провести "бумажное" голосование - просто нереально.</b>
Только лишь для запуска собрания, по закону, потребуется сделать рассылку уведомлений заказными письмами - это порядка 150 000 рублей в нашем доме.
А сбор кворума займет несколько месяцев. И по прошествии этих месяцев, МЖИ может придраться к запятой в форме бланка и не признать собрание (особенно если его тема - смена УК).

Таким способом каждый вопрос будет решаться оооочень долго.
А нерешенных вопросов уже сейчас накопилось предостаточно - видеонаблюдение в лифтах, мытье окон с внешней стороны, слишком редкая уборка в коридорах, разделительный бордюр на въезде в паркинг, мойка на -1 этаже, которая затапливает -4 этаж, и так далее.
А если встанет вопрос о смене УК? - как это сделать в условиях бумажного голосования, когда без участия УК сложно даже уведомления разослать?
Вы что-нибудь слышали от УК про второе собрание собственников? Сотрудники УК напоминали вам про голосование? Конечно нет. Им очень и очень неудобен "Активный Гражданин".

Потому что "Активный Гражданин" позволяет провести собрание <b>за 5 дней</b>, с электронным голосованием, прозрачным образом и без вмешательства УК.
`





const BOT_MSG_VOTE2 = `
<b>Что делать?</b>
Надо просто заполнить <a href="https://assets.website-files.com/5cadb302aac547675d199151/5cdda690ee894cc0d0b03af0_2%D0%BE%D1%81%D1%81.%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5.pdf">этот бланк</a> и отдать его администратору башни.
До вечера 21-го июня (пятница) включительно.

<b>Если Вы можете приехать в Пресня Сити до 18:00 пятницы, 21 июня:</b>
<b>1.</b> Возьмите <a href="https://assets.website-files.com/5cadb302aac547675d199151/5cdda690ee894cc0d0b03af0_2%D0%BE%D1%81%D1%81.%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5.pdf">бланк</a> для голосования на ресепшен вашей башни. Бланков можно взять несколько - <b>для квартиры, кладовки и парковки</b>
<b>2.</b> Заполните всё, что сможете. Что не знаете - пропустите.
<b>3.</b> Проголосуйте по каждому пункту. Самые важные вопросы с 9-го по 14-й (про систему электронного голосования "Активный Гражданин")
<b>4.</b> Отдайте бланк администратору.

<b>Если Вы НЕ сможете приехать в Пресня Сити:</b>
<b>1.</b> Скачайте бланк <a href="https://assets.website-files.com/5cadb302aac547675d199151/5cdda690ee894cc0d0b03af0_2%D0%BE%D1%81%D1%81.%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5.pdf">вот здесь</a> и распечатайте его. Бланков можно оформить несколько - <b>для квартиры, кладовки и парковки</b>
<b>2.</b> Заполните всё, что сможете. Что не знаете - пропустите.
<b>3.</b> Проголосуйте по каждому пункту. Самые важные вопросы с 9-го по 14-й (про систему электронного голосования "Активный Гражданин")
<b>4.</b> Сфотографируйте подписанный бланк и отправьте фото на почту presnya.golos@gmail.com; доставку оригинала обсудим в переписке.

Для голосования важны квадратные метры! Поэтому голосуйте всем, что у вас есть в Пресня Сити - <b>квартирами, кладовками и парковками!</b>

<i>Пожалуйста, не игнорируйте "Активного Гражданина" (п.9-14). Без хорошей системы голосования мы с вами технически не сможем принять никакого решения, и УК будет этим пользоваться.</i>
`





const BOT_MSG_WELCOME = `, добро пожаловать в официальный чат ЖК Пресня Сити!
Нажмите здесь: @PresnyaBot, чтобы найти своих соседей.

<b>Контакты</b> и список всех чатов Пресня Сити:
https://presnya.pro/kontakty

<b>Аренда парковок и кладовок</b> в Пресня Сити:
https://www.presnya.pro/offers/parking

<b>Промокоды</b>, скидки и рекомендации по поставщикам от соседей:
https://www.presnya.pro/offers/promos
`;





const BOT_OSS_MESSAGE = `<b>28.05 в 18:30 стартует 2-е собрание собственников</b>

Уважаемые соседи!
За 2.5 месяца работы и переговоров с УК удалось изменить договор управления:
1) Стоимость вывоза мусора снижена на 40% - с 419 до 249 р/кв.м
2) Пункт 4.2.6: про контроль регламента ремонта (со штрафами) - удалён из договора.
3) Пункт 4.2.7: обязанность отдать в УК комплект ключей от своих помещений - это обязательство упразднено.
4) Пункт 4.2.8: право УК входить в квартиру без собственника и составлять опись имущества - это право упразднено.
5) Пункт 2.12: автоматическое право УК представлять наши интересы во всех судебных инстанциях - это право ограничено списком конкретных тем.
6) Пункт 2.3: право УК размещать в нашем доме рекламу на своё усмотрение и получать с этого доход - теперь это можно делать только по решению общего собрания собственников
7) Пункт 2.4: право УК передавать наши персональные данные любым третьим лицам без уведомления и подписания согласия - теперь передача запрещена, кроме оговоренных в договоре случаев.

За новую редакцию надо проголосовать на общем собрании <b>28-го мая (завтра)</b> - Вопрос №8 в <a href="https://assets.website-files.com/5cadb302aac547675d199151/5cdda690ee894cc0d0b03af0_2%D0%BE%D1%81%D1%81.%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5.pdf">бланке решений</a>.

<b>ЭТО ОЧЕНЬ ВАЖНО СДЕЛАТЬ.</b>

Если, конечно, вы не хотите остаться со старым договором, регламентом и завышенной почти вдвое ценой за мусор.
<b>Время: 28 мая (вторник), регистрация в 18:30, начало в 19:00.
Адрес: г. Москва, Малый Конюшковский пер., д.2, 1-й этаж.</b>
Материалы по собранию: https://presnya.pro/oss2

Вообще, всё второе собрание посвящено одной большой теме: как обуздать УК и сделать так, чтобы собственники дома не оказались молчаливыми заложниками обстоятельств, навязанных ПИК-Комфортом.
Из общения с юристом мы вынесли несколько инструментов, которые помогут дому контролировать работу УК:
1) Совет дома
2) Активный Гражданин (электронное голосование на площадке города, без необходимости ходить на поклон в УК)
3) Оплата коммунальных услуг через городской МФЦ, а не частную лавочку на усмотрение УК
4) И сам исправленный договор - это тоже важный инструмент взаимодействия с УК

Если Вы не сможете придти на собрание 28-го мая, то проголосуйте, пожалуйста, заочно до 21-го июня. Для этого:
1. Возьмите бланк решения из письма-уведомления или <a href="https://assets.website-files.com/5cadb302aac547675d199151/5cdda690ee894cc0d0b03af0_2%D0%BE%D1%81%D1%81.%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5.pdf">скачайте</a> его с сайта https://www.presnya.pro/oss2
2. Заполните бланк (в ячейках для голоса лучше ставить подпись, а не крестик или галочку - чтобы ваш бланк было сложно испортить)
3. <b>Обязательно сфотографируйте бланк на свой телефон!</b> Пусть у вас в телефоне останется копия для подстраховки.
4. Отдайте заполненный бланк администратору вашей башни. Можно попросить его сделать копию и расписаться на ней за принятие голоса.
5. Пришлите фото вашего бланка на почту: <b>presnya.golos@gmail.com</b> - чтобы была возможность проконтролировать действия УК по сбору голосов.

Подробнее о новой редакции договора: https://presnya.pro/dogovor-upravleniya
Информация по второму собранию: https://www.presnya.pro/oss2
Присоединиться к юридическому чату: /lawyer
`




const BOT_OSS_MESSAGE_OLD = `Уважаемые соседи!
Подходит к концу первое общее собрание жильцов - 31-е мая последний день голосования.
Что может начаться после 31-го мая, когда УК почувствует себя полновластным хозяином положения, сложно предсказать.
Даже сейчас, еще до подведения итогов, они не стесняются ходить по квартирам и фотографировать их без согласия собственников, выкладывать эти фото в публичный доступ, останавливать ремонт, незаконно требовать купить согласование СРО-проектов у некого ООО "Маяк" (которое не имеет членства в СРО и должной сертификации), вести себя откровенно хамски, называть собственников "ворами" и всё это на фоне полнейшего пренебрежения к свои обязанностям: МОП-ы не убираются, на крышу толпами ходят малолетки-руферы, двери обклеяны рекламой, охрана ничего не делает, администраторов на своих местах никогда не быает, лифты не рабтают и так далее.

Конечно, мы не призываем к революции и смене УК.
Но оставлять текущую команду УК без какого-либо надзора, без рамок и ограничения их власти - просто страшно.

Поэтому ряд собственников, несогласных с таким поведением УК, но считающих, что конструктивный, мирный и законный выход из этого идиотизма всё же есть, предлагают ввести 4 механизма взаимодействия с УК:
<b>1) Новый договор управления</b>
<b>2) Совет дома</b>
<b>3) Активный Гражданин</b> - система города Москвы для проведения голосований собственников.
<b>4) Московский МФЦ</b> в качестве расчетного центра (для прозрачного перечисления коммунальных платежей через независимую от УК организацию).

Чтобы эти механизмы заработали, за них надо проголосовать на втором собрании собственников (28.05 - 21.06).
Они нужны, чтобы создать противовес безграничной власти УК в нашем доме.
Без такого баланса будет очень сложно добиться от УК решения каких-либо проблем дома, ведь единичные жалобы этих опытных ребят не пугают.
Нужно вспомнить, что Пресней Сити владеем мы, собственники, а не Гришин с Зотовым. Нужно объединяться и возвращать УК на землю. 

Прошу Вас, приходите <b>28-го мая (вторник) в 18:30</b> на очную часть Общего Собрания Собственников (адрес: г. Москва, Малый Конюшковский пер., д.2, 1-й этаж).
Если Вы не можете участвовать в очном голосовании, то проголосуйте заочно. Для этого:
1. возьмите бланк решения из письма-уведомления или скачайте его здесь: https://www.presnya.pro/oss2
2. заполните бланк (в ячейках для голоса лучше ставить подпись, а не крестик или галочку - чтобы ваш бланк было сложно испортить)
3. обязательно сфотографируйте бланк на свой телефон! Пусть у вас останется копия для подстраховки
4. отдайте заполненный бланк администратору вашей башни
5. пришлите фотокпию бланка на почту: fedor.pavlov@gmail.com - чтобы была возможность проконтролировать действия УК по сбору голосов

Подробнее о новой редакции договора: https://presnya.pro/dogovor-upravleniya
Информация по второму собранию: https://www.presnya.pro/oss2
Присоединиться к юридическому чату (который всё это сделал): /lawyer
`




/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Меню

const BOT_MENU = `
/stack - соседи в том же стояке (над и под вами)
/floor - соседи по этажу
/tower - соседи в вашей башне
/menu  - все функции бота`;





const BOT_WHATS_NEXT = `<b>Что дальше?</b>
Для подтверждения собственности нажмите здесь: /confirm
Нажмите /menu, чтобы увидеть списко всех функций бота`;





const BOT_MSG_HOWOT_CONFIRM = `Чтобы подтвердиться в качестве проверенного собственника ЖК Пресня Сити, пожалуйста, отправьте мне фото ДДУ или ДКП или выписки из ЕГРН (со штампом регистратора; скан или скриншот ДДУ/ДКП не годится, так как на скане нет штампа) плюс документ, удостоверяющий личность того человека, который указан в ДДУ. Годится водительское, пенсионное, СНИЛС, удостоверение адвоката или журналиста, загран или только в КРАЙНЕМ случае паспорт.

ВАЖНО: Номер документа и другие данные (дата рождения, фото и т.д.) НУЖНО закрыть или замазать, потому что последнее, что мне нужно - это ваши перс.данные. Если вы пришлете боту перс.данные, это никак не поможет отличить вас от агента: ведь все агенты из офиса продаж имеют на руках наши с вами перс.данные, и им ничего не стоит прислать эти данные сюда.

Нужна именно фотогорафия, на которой видно, что вы владеете оригиналом - идеально, если фото будет с рукой(пальцем) в кадре, и сделано на фоне оригинала ДДУ/ДКП/Выписки. Фотография экрана с файлом или ксерокопия - не годятся.

Как только документы будут проверены, вам придет уведомление и поздравления. Обычно, это происходит в течение нескольких часов.

Успехов!`;





const BOT_MSG_NEED_REGISTRATION_PUBLIC = "а Вы пока не зарегистрированы в шахматке. Напишите, пожалуйста, мне в личку номер вашей квартиры.\n@PresnyaBot";
const BOT_MSG_NEED_REGISTRATION = `Для доступа к этой информации нужна регистация в шахматке. Пожалуйста, отправьте мне номер вашей квартиры, и я Вас зарегистрирую.`;





const BOT_MSG_NEED_CONFIRMATION_PUBLIC = "Могу ошибаться, но у Вас пока нет подтверждения собственности. Новости могут содержать сообщения из закрытого соседского чата, поэтому такое подтверждение необходимо. Пришлите, пожалуйста, фото ДДУ мне в личку (в общий чат кидать не надо).\n@PresnyaBot";
const BOT_MSG_NEED_CONFIRMATION = `Эта информация доступна только для верифицированных владельцев.
Новости могут содержать тексты и фото из закрытого чата самых настоящих соседей, поэтому верификация необходима.
Если Вы уже зарегистрировались в шахматке, то вам осталось только прислать мне фото ДДУ и документа с вашим именем (годится водительское, загран или паспорт; номер документа, конечно же, надо замазать или закрыть).
Если Вы еще не зарегистрировались, то просто пришлите мне номер вашей квартиры.`;





const BOT_MSG_LAWYER_NEEDS_CONFIRMATION = `Работа с юристом и доступ в соотвествующий чат возможны только для подтвердившихся соседей.
Если Вы уже зарегистрировались в шахматке, то вам осталось только прислать мне фото ДДУ и документа с вашим именем (годится водительское, загран или паспорт; номер документа, конечно же, надо замазать или закрыть).
Если Вы еще не зарегистрировались, то просто пришлите мне номер вашей квартиры.`;





const BOT_MSG_LAWYER_WAITING_FOR_PAYMENT = `<b>Юридический чат</b>
Совместными усилиями юридического чата, (объединившего 100 человек), оплачен квалифицированный юрист и другие расходы, включая официальный сайт ЖК Пресня Сити www.presnya.pro

<b>Первые результаты:</b>
1. Совместно с представителями УК согласована новая версия договора
2. Значительно снижены тарифы на вывоз мусора 
3. Запущено 2 ОСС
4. На рассмотрении снижение тарифов СРО

<b>Вопросы на рассмотрении:</b>
- перерасчета коммунальных платежей (охрана, уборка, лифты)
- усиления охраны
- работы администратора
- другие важные вопросы

<b>О размере взноса:</b>
Каждому участнику бот выберет индивидуальную сумму взноса в диапазоне от 997 до 1003 рублей. Эта сумма уникальна, она связана именно с Вами и не повторяется среди других соседей. Когда деньги поступят на карту, бот сможет узнать Вас по сумме взноса и Вас добавят в закрытый юридический чат.

<b>Как присоединиться:</b>
Сделайте, пожалуйста, перевод на одну из указанных ниже карт.
Вас добавят после зачисления средств на карту.
Выбирайте любую:
Сбер: <b>4276 3801 1093 3277</b> (<a href="tg://user?id=183673345">Кирилл</a>)
Сбер: <b>4276 3801 7668 6751</b> (<a href="tg://user?id=435715065">Жанна</a>)`;





const BOT_MSG_NOTHINGNEW_NEWS_PUBLIC = 'А вы уже всё прочитали, и ничего нового пока не появилось';
const BOT_MSG_NOTHINGNEW_NEWS_PRIVATE = `Пока никаких новостей нет.
Ждем-с...

А тем временем, Вы тоже можете делать новости!
Найдите сообщение, которое, по вашему мнению, несет в себе полезный контент. И ответьте на него (сделайте reply) символом '+', или '👍', или хэштегом #вновости.
Бот увидит этот комментарий и сохранит сообщение. Когда в следующий раз Вы запросите /news, бот покажет вам все отмеченные таким образом сообщения из всех чатов, которые мониторит @PresnyaBot`;





const BOT_MSG_NOTHINGNEW_NEWS_ZOTOV_PUBLIC = 'А вы уже прочитали все сообщения от Константина, и более свежих пока не поступало.';
const BOT_MSG_NOTHINGNEW_NEWS_ZOTOV_PRIVATE = 'Новых сообщений пока не поступало. Если хотите посмотреть прямо всю историю сообщений от Константина, нажмите вот на эту ссылку: /konstantin_all';





const BOT_MSG_NOTHINGNEW_NEWS_NICKY_PUBLIC = 'А вы уже прочитали все сообщения от Николая, и более свежих пока не поступало.';
const BOT_MSG_NOTHINGNEW_NEWS_NICKY_PRIVATE = 'Новых сообщений пока не поступало. Если хотите посмотреть прямо всю историю сообщений от Николая, нажмите вот на эту ссылку: /nikolay_all';

	



////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports.install = function(bot) {

    bot.use		(mw_upgarde_ctx);
	bot.use		(mw_spam_filter);
    bot.use     (mw_logger);
    bot.use     (answer_callback);
	bot.use     (user_session({logger: trace.info, support: support}, bot.context))
    bot.use     (mw_valid_user_only);
    bot.use     (session())
	bot.use		(if_public(mw_archive));
	bot.use		(mw_kick_kbk);
	bot.use     (stage.middleware());

	
    bot.hashtag	(['#насайт', '#вновости'],	(get_mw_collector('news_chat')));
    bot.hashtag	(['#вопрос', '?'],			if_public(get_mw_collector('news_zotov')));
    bot.action	('/lawyer',					get_safe_mw(mw_money_offer, BOT_MSG_LAWYER_NEEDS_CONFIRMATION));
    bot.command	('/lawyer',					get_safe_mw(mw_money_offer, BOT_MSG_LAWYER_NEEDS_CONFIRMATION));
    bot.command	('/this',					this_chat);
    bot.command	('/cash', 					mw_money_cash);
    bot.command	('/news',					if_public((ctx) => ctx.deleteMessage()));
    bot.command	('/stack',					if_public((ctx) => {

        return ctx.db.query(`select count(*) as cnt from archive where sender.id=${ctx.user.id}`).then(result => {

            ctx.user.stack = `${(ctx.user.stack || '')}🎉`;
            return ctx.replyTo(`${ctx.user.stack}\nВаших сообщений в музее Пресни Сити: ${result[0].cnt} шт.`);

        }).catch(() => {

            ctx.user.stack = `${(ctx.user.stack || '')}🎉`;
            return ctx.replyTo(ctx.user.stack);
        })

    }, if_registered(mw_search_stack)));

	bot.on		('new_chat_members', if_public(mw_welcome));
	//bot.on	('left_chat_member', mw_hide_kick);
	bot.on		('left_chat_member', mw_hide_leaving);
	bot.hears	(REX_ESTR, reply("Воистину Воскресе! 🎉🐰"));

    /// Далее идут скилиы, которые возможны только в private-чате
	bot.use		(mw_private_or_system_chats_only);
	bot.use		(mw_debug_reflection);
    bot.use		(mw_blocked_users);
    bot.start	(if_registered(mw_intoduction_existing, mw_intoduction_new));
	bot.use		(stage.middleware());
    bot.hears   (/^\s*\d{3}\s+\d{1,2}\s*$/, if_chat(917408627, mw_window_show_contact))
    bot.hears   (/^\s*\d{3}\s+\d{1,2}\s*$/, if_chat(771172117, mw_window_show_contact))
	bot.on      ('forward', 	if_private(mw_user_info))
    bot.command	('/menu', 		mw_menu);
    bot.action	('/menu', 		mw_menu);
    bot.hears	(REX_MENU,		mw_menu);
    bot.hears	(REX_APPT,		mw_start_registration);
    bot.hears	(REX_THNX,		ctx => ctx.reply('Пожалуйста!'));
    bot.action	(REX_RECV,		mw_money_recieve);
    bot.action	(REX_CONF,		mw_accept_documents);
    bot.action	('reject-doc',	mw_reject_documents);
    bot.action	('reply',		mw_unknown_message_reply);
    bot.action	('/join',		mw_request_registration);
    bot.action	('/confirm', 	mw_confirm);
    bot.command	('/confirm', 	mw_confirm);
    bot.command	('/approve',	mw_accept_documents_manual);
    bot.command	('/me',			if_private(mw_me, ctx => ctx.deleteMessage()));
    bot.hears	(['me','Me','ме','Ме'], mw_me );
    bot.hears	(/^(.{1,3}|\s+)?окн[ао](.{1,3}|\s+)?$/i, if_private(if_registered(mw_wash_windows)));
    bot.hears	(/^(.{1,3}|\s+)?(помыть\s+)*окн[ао](\s*альпинист.*)?(.{1,3}|\s+)?$/i, if_private(if_registered(mw_wash_windows)));
	bot.hears	(/^(\s+)?мойка ок(он|на)/i, if_private(if_registered(mw_wash_windows)));
    bot.hears	(/^(.{1,3}|\s+)?мыть?[ёео]\s+(окна|окон)(\s*альпинист.*)?(.{1,3}|\s+)?$/i, if_private(if_registered(mw_wash_windows)));
    bot.command	('/okna', if_private(if_registered(mw_wash_windows)));
    bot.action	('/okna', if_private(if_registered(mw_wash_windows)));

    bot.command	('/help',		mw_help);
    bot.hears	(['?','/?'],	mw_help);
	bot.command (['/chats', '/chat'],								if_private(ctx => ctx.reply(BOT_MSG_RESOURCES, Extra.HTML())));
    bot.action  (['/chats', '/chat'],								if_private(ctx => ctx.reply(BOT_MSG_RESOURCES, Extra.HTML())));
	bot.hears	(['chat','chats', 'чаты', 'Чаты', 'чат', 'Чат'],	if_private(ctx => ctx.reply(BOT_MSG_RESOURCES, Extra.HTML())));
    bot.action  ('/service',                                        if_private(ctx => ctx.scene.enter('order-service')))
    bot.command ('/service',                                        if_private(ctx => ctx.scene.enter('order-service')))
	bot.command	('/budgetcorr',					mw_send_correction);
	bot.action	(actions.broadcast,				mw_broadcast);
    bot.command	('/send',						mw_broadcast_preview);

    /// Далее идут скилиы, которые требует регистрации в шахматке
    bot.command ('/santa_send', if_registered(mw_santa_sendout_reminder));
    bot.command ('/santa_send_buttons', if_registered(mw_santa_sendout_ready_buttons));
    bot.action  (actions.santa_get,     if_registered(mw_santa_get));
    bot.action  (actions.santa_clear,   if_registered(mw_santa_clear));
    bot.action  (actions.santa_ready,   if_registered(mw_santa_ready));

    bot.action	('/floor',		if_registered(mw_search_floor));
    bot.action	('/stack',		if_registered(mw_search_stack));
    bot.action	('/tower',		if_registered(mw_search_tower));
    bot.action	('/protection', if_registered(mw_get_protection));
    bot.command	('/floor',		if_registered(mw_search_floor));
    bot.command	('/stack',		if_registered(mw_search_stack));
    bot.command	('/tower',		if_registered(mw_search_tower));
	bot.command ('/protection', if_registered(mw_get_protection));
	bot.action	('/news',		get_safe_mw(get_mw_news_reader('news_chat', false, BOT_MSG_NOTHINGNEW_NEWS_PRIVATE, BOT_MSG_NOTHINGNEW_NEWS_PUBLIC)));
    bot.hears	(['news', 'News', '#news', '@news', ' /news'],	get_safe_mw(get_mw_news_reader('news_chat', false, BOT_MSG_NOTHINGNEW_NEWS_PRIVATE, BOT_MSG_NOTHINGNEW_NEWS_PUBLIC)));
    bot.hears	(['lawyer', 'Lawyer', 'lawer', 'Lawer'],		get_safe_mw(mw_money_offer, BOT_MSG_LAWYER_NEEDS_CONFIRMATION));
    bot.on		(['photo', 'document'], if_registered(mw_request_approval));
    bot.hears 	(['Плёнка', 'плёнка', 'Пленка', 'пленка'], if_registered(mw_get_protection));
    bot.action	('cms_item_remove'  , mw_cms_remove);
    bot.action	('cms_item_unhide'  , mw_cms_unhide);
    bot.action  (/wash_conf:.+/     , mw_wash_confirmatiom );
    bot.action  (['wash_vote_ar:no', 'wash_vote_ar:yes'] , mw_wash_vote_antirain );
    bot.command ('/wash_broadcast'  , mw_wash_broadcast);
    bot.command	('/u', ctx => {

        let cmd = ctx.update.message.text.substring(3);

        return ctx.db
            .query(`select *, out('owned'):{id, floor, tower} as apt, out('confirmation') as conf from user where any() like '%${cmd}%'`)
            .then(result => Promise.all(result.map(user => ctx
                    .reply(toString(user['@data'] || user))
                    .then(() => ctx.reply(user.link, Extra.HTML()))
                    .catch(err => ctx.reply(toString(err)))
            )));
    });

    bot.command	('/a', ctx => {

        let cmd = ctx.update.message.text.substring(3);

        return ctx.db
            .query(`select id, floor, tower.name, windows, in('owned'):{id, username, firstname, lastname, @rid} as owners from apartment where id = ${cmd}`)
            .then(result => Promise.all(result.map(apt => ctx
                    .reply(toString(apt['@data'] || apt))
                    .then(() => (apt.owners.length > 0) && ctx.reply(toText(apt.owners, '<a href="tg://user?id={id}">{username:{$} (}{firstname:{$} }{lastname:{$}}{username:)}</a>'), Extra.HTML()))
                    .catch(err => ctx.reply(toString(err)))
            )))
            .then(() => ctx.db.query_one(`select from wash_budget_2020_03 where ${cmd} in apts.id`))
            .then(wash => wash && ctx.reply(toString(wash)))
    });


    bot.command('/qu', mw_parse_args, ctx => {

        console.log("\nCTX ARGS:", ctx.args);
        return ctx.reply(ctx.args);
    })


    bot.command	('/q', ctx => {

        trace.info("QUERY", ctx.update);
        ctx.reply(ctx.update.message.text.substring(3));

        return ctx.db.query(ctx.update.message.text.substring(3)).then(result => {

            if (Array.isArray(result)) result = result.map(i => { return i['@data'] || i });
            trace.info("QUERY RESULT:", result);
            return ctx.reply(JSON.stringify(result, null, "\t"), Extra.HTML());

        }).catch(err => {

            trace.info(err);
            return ctx.reply(err);
        });
    });

    bot.command	('/qc', ctx => {

        trace.info("QUERY", ctx.update);
        ctx.reply(ctx.update.message.text.substring(4));

        return ctx.db.command(ctx.update.message.text.substring(3)).then(result => {

            if (Array.isArray(result)) result = result.map(i => { return i['@data'] || i });
            trace.info("QUERY RESULT:", result);
            return ctx.reply(JSON.stringify(result, null, "\t"));

        }).catch(err => {

            trace.info(err);
            return ctx.reply(err);
        });
    });


    bot.command	('/up', ctx => {

        trace.info("USER PICTURE", ctx.update);
        ctx.reply(ctx.update.message.text.substring(4));

		const user_id = ctx.update.message.text.substring(3)

		return bot.api.get

        return ctx.db.command().then(result => {

            if (Array.isArray(result)) result = result.map(i => { return i['@data'] || i });
            trace.info("QUERY RESULT:", result);
            return ctx.reply(JSON.stringify(result, null, "\t"));

        }).catch(err => {

            trace.info(err);
            return ctx.reply(err);
        });
    });

    bot.command ('/delete', ctx => {

        trace.info('DELETE MSG');

        return ctx.bot.telegram
            .deleteMessage(-1001496098878, 137512)
            .then(r => { console.log('\n\nDELETE RESULT:', r, '\n\n'); return r; } )
            .then(r => ctx.reply(JSON.stringify(r)))
            .catch(trace.error);
    });

    //{"id": "1", "answer": "yes"}
    //{"id": "2", "answer": "no"}
    bot.action(/^\{"vote":\{.+\}\}$/i, ctx => {

        let data = JSON.parse(ctx.update.callback_query.data);

        trace.info("VOTE", data.vote, {link: ctx.user.link, fname: ctx.user.firstname, lname: ctx.user.lastname, id: ctx.user.id});

        if (data.vote.id == 1) {

            return ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
                [Markup.callbackButton("Да, голосовал",		`{"vote":{"id":11,"answer":"yes"}}`)],
                [Markup.callbackButton("Нет, не голосовал",	`{"vote":{"id":11,"answer":"no"}}`)],
            ])).then(() => ctx.reply('Упс... нажмите кнопку с вашим выбором еще раз, пожалуйста!'))
        }

        return ctx.db.insert("vote", {

            vote_id: data.vote.id,
            user_id: ctx.user.id,
            user: ctx.user._rid,
            answer: data.vote.answer

        }).then(() => {

            if (data.vote.id == 3) {

                if (data.vote.answer == 'need help') {

                    return ctx.reply("Принято. С вами свяжется кто-то из соседей в ближайшее время")
                    .catch(trace_err(data.vote, ctx.user))
                    .then(() => ctx.bot.telegram.sendMessage(CHT_ATTN, `${ctx.user.link} просит помощи с голосованием`))
                    .catch(trace_err(data.vote, ctx.user))
                    .then(() => ctx.bot.telegram.sendMessage(-397672144, `${ctx.user.link} просит помощи с голосованием`))
                }

                return ctx.reply("Принято. Спасибо!");
            }

            else {

                let nxt = (1 + data.vote.id) % 10;
                return ctx.reply(BOT_QUIZ[nxt].msg, BOT_QUIZ[nxt].extra)
            }
        });
    });



    //{"type": "apt", "name1": "квартира", "name2": "квартиры"}
    //{"type": "parking", "name1": "парковка", "name2": "парковки"}
    //{"type": "storage", "name1": "кладовка", "name2": "кладовки"}
    bot.action(/^\{"prop":\{.+\}\}$/i, ctx => {

        ctx.session.prop = JSON.parse(ctx.update.callback_query.data)['prop'];
        return ctx.scene.enter('add-prop');
    });



    //{"type": "ddu"}
    //{"type": "app"}
    //{"type": "pdkp"}
    //{"type": "dkp"}
    //{"type": "egrn"}
    bot.action(/^\{"docs":\{.+\}\}$/i, ctx => {

        ctx.session.doc = JSON.parse(ctx.update.callback_query.data)['docs'];
        return ctx.scene.enter('add-docs');
    });




    bot.command('/zakrytiy', ctx => {

        return ctx.bot.telegram.exportChatInviteLink(CHT_PRIV).then(link => ctx.reply(link));
    })





    bot.action(REX_FILM, if_registered(ctx => {

        ctx.deleteMessage();

        let data = JSON.parse(ctx.update.callback_query.data)["film"];

        return ctx.db.select_one({select:'*, tower:{*}', from:'film', where:{id: data.id}}).then(film => {

            if (!film) {

                trace.error("ERROR: the film is not found!", film);
                return ctx.reply("Такая пленка не найдена!");
            }

            if (film.claimed_by) {

                trace.error("ERROR: this film is already occupied!", film);
                return ctx.reply("Эта пленка уже забронирована!");
            }

            return ctx.db.update(film._rid, {claimed_by: ctx.user._rid, claimed_on: Date.now()}).then(() => {

                return ctx.reply(`Спасибо! Номер вашей пленки для ${film.floor} эт. (${film.tower.name}):\n\n<b>${data.id}</b>\n\nПродиктуйте его бармену в кафе Прогресс (Пресненский вал, 38 - пять минут пешком от Пресня Сити) и бармен выдаст вам комплект из трёх вещей:\n1. Защитная пленка\n2. Трафарет под размеры наших вызывных панелей\n3. Конверт с наклейками\n\nИ не забудьте, что у жителей Пресня Сити в кафе Прогресс есть скидка 20% на любой кофе - от эспрессо до флэт-уайта.`, Extra.HTML());
            });
        });
    }));





    bot.hears(REX_RELS, if_film_chat(ctx => {

        let id = ctx.update.message.text;

        return ctx.db.select_one({select:'*, tower:{*}, claimed_by:{*}', from:'film', where:{id: id}}).then(film => {

            if (!film) {

                trace.error("ERROR: the film is not found!", film);
                return ctx.reply("Такой пленки нет на складе!");
            }

            if (!film.claimed_by) {

                trace.error("ERROR: this film hasn't been claimed yet!", film);
                return ctx.reply("Эта пленка еще никем не забронирована!");
            }

            if (film.released_by) {

                trace.error("ERROR: this film has been released already!", film);
                return ctx.reply("Эта пленка уже была выдана!");
            }

            return ctx.db.update(film._rid, {released_by: ctx.user._rid, released_on: Date.now()}).then(() => {

                return ctx.reply(`Принято! Отдайте, пожалуйста, вашему гостю три вещи:\n1. Защитную плёнку\n2. Листок с трафаретом\n3. Конверт с наклейками.\n\nСпасибо!!!`).catch(trace.error);

            }).then(() => {

                return ctx.bot.telegram.forwardMessage(film.claimed_by.chat, CHT_FILM, 79).catch(trace.error);

            }).then(() => {

                return ctx.bot.telegram.forwardMessage(film.claimed_by.chat, CHT_FILM, 110).catch(trace.error);
            });
        });
    }));

    bot.command ('/key',        ctx => ctx.reply(access_card_id(ctx.update.message.text)));
    bot.command ('/kick',       mw_kick_out(701033582, -1001400315794));

    /// Это должен быть последний фильтр в цепочке - неизвестныые сообщения роутятся в спец.чат
    //bot.hears	(REX_APP2,		mw_start_registration);
    bot.command	('/stat', 		stat);

    bot.action(actions.santa_accept, ctx => {

        return ctx.db
            .register_santa(ctx.user)
            .then(() => ctx.reply('Отлично! Записал вас.\n\n28-го числа пришлю вам имя того счастливца, которому вам нужно будет сделать подарок на этот новый год. А пока можете уже обдумывать идеи для подарка :)'), () => ctx.reply('Упс, что-то пошло не так... Попробуйте снова'))
            .then(() => ctx.editMessageReplyMarkup());
    });

    bot.action(actions.santa_decline, ctx => {
    
        return ctx
            .reply('Ок, не записываю')
            .then(() => ctx.deleteMessage())
    })

    bot.command('/login', mw_login)
    bot.on('message', mw_unknown_message)
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// TOOLS ////////////////////////////////////////////////////////////////////////////////////////////

function mw_logger(ctx, next) {

    console.log(ctx.update)
    return next()
}

function mw_valid_user_only(ctx, next) {

    if (ctx.user && typeof ctx.user === 'object' && ctx.user.id) return next()
}

function mw_upgarde_ctx(ctx, next) {

	/*

	let reply = ctx.reply;

	ctx.reply = (msg, extra) => {

		trace.info("SENDING REPLY", {to: ctx.from, chat: ctx.chat, reply: msg});
		return reply(msg, extra);
	}

	*/

	ctx.replyAutoDelete = (msg, extra) => {

		trace.info("SENDING SELF-DESTROY REPLY", {to: ctx.from, chat: ctx.chat, reply: msg});
		return ctx.bot.telegram.sendMessage(ctx.chat.id, msg, extra).then(m => {

			setTimeout(() => ctx.bot.telegram.deleteMessage(m.chat.id, m.message_id).catch(trace.error), TM_DELET)
		});
	}

	ctx.replyAutoDeleteTo = (msg) => {

		let inReplyTo = ctx.update && ctx.update.message && ctx.update.message.message_id && Extra.inReplyTo(ctx.update.message.message_id) || undefined;
		return ctx.replyAutoDelete(msg, inReplyTo);
	}

	return next();
}



function get_mw_reply(msg) {

	return (ctx) => {

		return ctx.replyAutoDeleteTo(msg);
	};
};



function reply(msg) {

	return (ctx) => {

		return ctx.replyTo(msg);
	};
};





function trace_err(...inputs) {

	return (err) => trace.error(err, ...inputs);
}





function groupBy (arr, ...keys) {

    let key = keys.shift();
    if (!key) return arr;
    if (!Array.isArray(arr)) return arr;

    let result = arr.reduce((cur, x) => {

        if (!cur.has(x[key])) cur.set(x[key],[]);
        cur.get(x[key]).push(x);
        return cur;

    }, new Map());

    if (keys.length > 0) {

        result.forEach((i, k, m) => {

            m.set(k, groupBy(i, ...keys));
        });
    }

    return result;
};





function buildNeighboursHTML(arr, titleMessage = "", defaultMessage = "<i>(соседи не найдены)</i>") {

	if(!arr) return defaultMessage;
	if(!Array.isArray(arr)) return defaultMessage;
	if(!arr.length) return defaultMessage;

	let msg = [titleMessage];

	groupBy(arr, "tower", "floor").forEach((t, name) => {

		msg.push(`<b>${name}:</b>`);

		t.forEach((f, name) => {

			msg.push(`<b>${name} эт:</b> ${Array.from(f.values()).map(i => i.link).join(', ')}`);
		})
	});

	return msg.join("\n");
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MIDDLEWARES //////////////////////////////////////////////////////////////////////////////////////

function answer_callback(ctx, next) {

    if (ctx.updateType === 'callback_query') {

        return next().finally(() => ctx.answerCbQuery());
    }

    return next();
}



function mw_parse_args(ctx, next) {

	ctx.args = ctx.update.message.text.replace(/\s*\/\w+(@\w+)(\b|\s+)/, '');
	console.log('\n\nMW_PARSE_ARGS:', ctx.update.message.text, ctx.args);
	return next(ctx);
}



function if_public(mw, mw_not = TELEGRAF.passThru()) {

	return (ctx, next) => {

		return ctx.chat.type == 'private' ? mw_not(ctx, next) : mw(ctx, next);
	};
};



function if_private(mw, mw_not = TELEGRAF.passThru()) {

	return (ctx, next) => {

		return ctx.chat.type == 'private' ? mw(ctx, next) : mw_not(ctx, next);
	};
};



function if_chat(chat, mw, mw_not = TELEGRAF.passThru()) {

    if (Array.isArray(chat)) {

        return (ctx, next) => {

            return chat.includes(ctx.chat.id) ? mw(ctx, next) : mw_not(ctx, next);
        }
    }

	return (ctx, next) => {

		return ctx.chat.id == chat ? mw(ctx, next) : mw_not(ctx, next);
	};
};


function if_film_chat(mw, mw_not = TELEGRAF.passThru()) {

	return (ctx, next) => {

		return ctx.chat.id == CHT_FILM ? mw(ctx, next) : mw_not(ctx, next);
	};
};



function if_registered(mw, mw_not = get_mw_reply(BOT_MSG_NEED_REGISTRATION)) {

	return (ctx, next) => {

		return ctx.user.apartments.then(result => {

			return (result && result.length > 0) ? mw(ctx, next, result) : mw_not(ctx, next);
		});
	};
};



function if_registered_or_exception(mw, mw_not = get_mw_reply(BOT_MSG_NEED_REGISTRATION)) {

	return (ctx, next) => {

		if (ctx.from.id === USR_ZOTOV) {

			return mw(ctx, next);
		};

		if (ctx.from.id === USR_NICKY) {

			return mw(ctx, next);
		};

		return ctx.user.apartments.then(result => {

			return (result && result.length > 0) ? mw(ctx, next, result) : mw_not(ctx, next);
		});
	};
};



function if_confirmed(mw, mw_not = get_mw_reply(BOT_MSG_NEED_CONFIRMATION)) {

	return (ctx, next) => {

		return ctx.user.confirmations.then(result => {

			return (result && result.length > 0) ? mw(ctx, next, result) : mw_not(ctx, next);
		});
	};
};



function get_safe_mw(mw, msg_non_confirmed = BOT_MSG_NEED_CONFIRMATION_PUBLIC, msg_non_registered = BOT_MSG_NEED_REGISTRATION_PUBLIC) {

	return if_confirmed(
		mw,
		if_registered(
			get_mw_reply(msg_non_confirmed),
			get_mw_reply(msg_non_registered)
		)
	);
}



function mw_private_or_system_chats_only(ctx, next) {

	if (ctx.chat.type === 'private')	return next(ctx);
	if (CHT_SYST.includes(ctx.chat.id))	return next(ctx);
};



function mw_blocked_users(ctx, next) {

	if (ctx.isPrivate) {

		if (ctx.user.blocked) {

			return ctx
				.forwardMessage(CHT_ATTN)
				.finally(() => ctx.reply(`Извиняюсь, ваш аккаунт заблокирован. Пожалуйста, обратитесь за помощью к <a href="tg://user?id=${SETTINGS.support_id}">поддержке, кликнув на эту ссылку</a>`, Extra.HTML()));
		}
	}

	return next(ctx);
};



function mw_debug_reflection(ctx, next) {

	return next(ctx).then(() => {

		let msg =
		ctx.message && ctx.message.text ||
		ctx.update.callback_query && ctx.update.callback_query.message && [ctx.update.callback_query.data, ctx.update.callback_query.message.text, ctx.update.callback_query] ||
		ctx.update;

		trace.info(`REFLECTION ${ctx.updateType}::${ctx.updateSubTypes}`, msg, ctx.user);
	});
};



function mw_search_floor(ctx) {

	return ctx.user.neighbours_floor.then(nbs => {

		trace.info("SEARCH RESULT [FLOOR]", ctx.from, nbs);
		trace.info("DEBUG", { replyWithHTML: typeof ctx.replyWithHTML });

		return ctx.replyWithHTML(buildNeighboursHTML(nbs,
			'Ваши соседи по этажу:',
			'<i>Пока никто из ближайших к Вам соседей по этажу не зарегистрировался в шахматке. Как только они появятся, я сразу же сообщу Вам об этом.</i>'
		));

	}).catch(trace.error);
};



function mw_search_stack(ctx) {

	return ctx.user.neighbours_stack.then(nbs => {

		trace.info("SEARCH RESULT [STACK]", ctx.from, nbs);

		return ctx.replyWithHTML(buildNeighboursHTML(nbs,
			'Cоседи по стояку - над вами или под вами:',
			'<i>Пока никто из ближайших к Вам соседей по стояку не зарегистрировался в шахматке. Как только они появятся, я сразу же сообщу Вам об этом.</i>'
		));

	}).catch(trace.error);
};



function mw_search_tower(ctx) {

	return ctx.user.neighbours_tower.then(nbs => {

		trace.info("SEARCH RESULT [TOWER]", ctx.from, nbs);

		return ctx.replyWithHTML(buildNeighboursHTML(nbs,
			'Cоседи по башне:',
			'<i>Пока никто из соседей в вашей башне не зарегистрировался. Как только они появятся, я сразу же сообщу Вам об этом.</i>'
		));

	}).catch(trace.error);
};



function get_mw_collector(className) {

	return (ctx, next) => {

		if (ctx.chat.type === 'private') return next(ctx);

		let msgs = [];
		if (ctx.update.message.reply_to_message) msgs.push(ctx.update.message.reply_to_message);

		let isTooShort = ctx.update.message.entities && ctx.update.message.entities.reduce((rv, x) => {return rv + x.length}, 0);
			isTooShort = ctx.update.message.text.length - (isTooShort || 0);
			isTooShort = isTooShort < 10;
		if(!isTooShort) msgs.push(ctx.update.message);

		trace.info(`GOING TO STORE MESSAGE [class: ${className}, by: ${ctx.user.username}]`, msgs);

		return Promise.all(

			msgs.filter(i => !ctx.chatinfo.isHidden(i.chat.id)).map(i => {

				return ctx.bot.telegram.forwardMessage(CHT_NEWS, i.chat.id, i.message_id).catch(trace.error).then(() => {

					return ctx.user._save_message(className, i).catch(trace.error);
				});
			})

		).then(news => {

			/* ATTENTION! - neeeds to be updated to new WF middleware
			return ctx.web.postnews(news.filter(i => ctx.chatinfo.isPublic(i.chat.id)));
			*/
		});
	};
};



function get_mw_news_reader(
								newsClass,
								all = false,
								nonews_private = BOT_MSG_NOTHINGNEW_NEWS_PRIVATE,
								noNews_public = BOT_MSG_NOTHINGNEW_NEWS_PUBLIC
	) {

	return (ctx) => {

		trace.info(`GOING TO READ SOME NEWS [class = ${newsClass}]`, ctx.from, ctx.chat);
		let isPrivate = ctx.chat.type === 'private';

		return ctx.user._retrieve_messages(newsClass, all).then(news => {

			let nCount = news && news.length > 0 && news.length || 0;

			if (nCount < 1) {

				return ctx.replyAutoDeleteTo(isPrivate ? nonews_private : noNews_public); 
			}

			if (nCount > 20) {

				ctx.replyAutoDeleteTo('минутку...');
			}

			let n = 0;

			return news.reduce((p, i) => {

				if ((i.sender.id == USR_ZOTOV) && ((ctx.from.id == USR_ZOTOV) || (ctx.from.id == USR_SUPP))) {

					nCount--;
					return p;
				}

				if ((i.sender.id == USR_NICKY) && ((ctx.from.id == USR_NICKY) || (ctx.from.id == USR_SUPP))) {

					nCount--;
					return p;
				}

				if (++n % MAX_MSPS === 0) {

					p = p.then(() => new Promise(resolve => setTimeout(resolve, TM_SLEEP)));
				}

				return [i.reply_to_message, i]
						.filter(x => x && x.message_id && x.chat && x.chat.id)
						.reduce((rv, i) => {

							return rv.then(() => {

								return ctx.telegram.forwardMessage(ctx.from.id, i.chat.id, i.message_id).catch(err => {

									if (!i.text) {
			
										trace.info("ERROR WHILE FORWARDING NEWS TO USER", typeof i, i['@data'] || i, err);
										return --nCount;
									}
			
									return ctx.telegram.sendMessage(ctx.from.id, i.get_html(), Extra.HTML()).catch(err => {
			
										trace.info("ERROR WHILE RESENDING NEWS AS HTML", err);
										return ctx.telegram.sendMessage(ctx.from.id, i.get_text()).catch(err => {
			
											nCount--;
											trace.info("ERROR WHILE RESENDING NEWS AS PLAIN TEXT", err);
										});
									});
								});
							});

						}, p);

				}, Promise.resolve()).then(() => {

					return nCount > 0 && !isPrivate ? ctx.replyAutoDeleteTo(`Отправил подборку вам в личку (${nCount} шт.)`) : null ;
				});
			});
	};
};



function mw_request_approval(ctx, next, apts) {

	if (ctx.chat.type !== 'private' || !ctx.update.message.photo) return next(ctx);

	return ctx.forwardMessage(CHT_ATTN).then(() => {

		trace.info(`REQUEST PHOTO APPROVAL [from = ${ctx.user.name}]`, ctx.user, apts);

		let buttons = [[Markup.callbackButton('✖️отклонить', "reject-doc"), Markup.callbackButton('написать', 'reply')]].concat(apts.map(i => {

			return [Markup.callbackButton(`✅подтвердить: ${i.id}`, JSON.stringify({"accept-doc":{apt: i.id}}).trim())];
		}));

		return ctx.bot.telegram.sendMessage(
			CHT_ATTN,
			JSON.stringify({

				ts: Date.now(),
				message: ctx.update.message.message_id,
				sender: ctx.update.message.from,
				chat: ctx.update.message.chat,
				photo: ctx.update.message.photo.reduce((rv, x) => { if (rv.file_size && rv.file_size > x.file_size) return rv; return x }, ctx.update.message.document || {})

			}, null, "\t"),
			Markup.inlineKeyboard(buttons).extra()

		).then(() => {

			return ctx.reply('Спасибо! Фото отправлено на проверку...');
		});
	});
};



function mw_accept_documents(ctx, next) {

	if (!ctx.update.callback_query.message.text) return next(ctx);

	let data = JSON.parse(ctx.update.callback_query.message.text);
		data.callback = JSON.parse(ctx.update.callback_query.data);
		data.callback.by = ctx.from;

	trace.info("GOING TO WRITE DOC ACCEPTANCE", data, ctx.user);
	return ctx.db.select_user_byID(data.sender.id).then(user => {

		if (!user) return trace.info("ACCEPT-DOCS FAILURE: can't find the user", data); 

		return user.write_acceptance(data.callback["accept-doc"].apt, data).then(result => {

			if (!result.success) return trace.info("ACCEPT-DOCS FAILURE:", result, data);

			trace.info(`DOCS ARE ACCEPTED [user = ${user.name}, user_id = ${user.id}, apt = ${data.callback["accept-doc"].apt}, by = ${ctx.user.name}]`, result);
			return ctx.bot.telegram.sendMessage(data.chat.id, "Ваш ДДУ принят, и регистрация подтверждена. Теперь вы в списке самых настоящих соседей ЖК Пресня Сити! Ура!").then(() => {

				ctx.resetCachedUser(user.id);

				return ctx.reply(`<b>Acceptance: Done.</b>\n\n[user = ${user.name}, user_id = ${user.id}, apt = ${data.callback["accept-doc"].apt}, by = ${ctx.user.name}]\n\nGet link: /zakrytiy`, Extra.HTML())
					.then(() => ctx.bot.telegram.getChatAdministrators(CHT_PRIV))
					.then(admins => Promise.all(

						admins.map(i => {

							trace.info("SENDING NOTIFICATION TO ADMIN", {admin: i.user, user: user['@data'] || user});
							return ctx.bot.telegram.sendMessage(i.user.id, `Привет, Админ закрытого чата!\nНаш новый сосед ${user.link} подтвердил владение собственностью в Пресня Сити, отправив боту фото ДДУ.\nФото проверено, и теперь можно принимать в наши ряды нового соседа!`, Extra.HTML()).catch(trace.error);
						})
					)
				);
			});
		});
	});
};



function mw_accept_documents_manual(ctx) {

	let user_id = ctx.update.message.reply_to_message.forward_from.id;
	let data = ctx.update.message.reply_to_message;
		data = {message: data.message_id, sender: data.forward_from, chat: {id: data.forward_from.id}, photo: data.photo || data.document || {comment: manual}, date: data.date, ts: Date.now()};

	if (Array.isArray(data.photo)) {

		data.photo = data.photo.reduce((rv, x) => { if (rv.file_size && rv.file_size > x.file_size) return rv; return x }, {});
	};

	return Promise.resolve(ctx.update.message.text.match(/\d+/g))
	.then(id => {

		if (id) return id[0];
		return ctx.db.select_one({select: 'id', from: 'apartment', where: `${user_id} in in_owned.out.id`}).then(result => result.id)
	})
	.then(apt_id => {

		trace.info("APROVE", {apt: apt_id});

		return ctx.db.select_user_byID(user_id).then(user => {

			if (!user) return trace.info("ACCEPT-DOCS FAILURE: can't find the user", data); 

			return user.write_acceptance(apt_id, data).then(result => {

				if (!result.success) return trace.info("ACCEPT-DOCS FAILURE:", result, data);

				trace.info(`DOCS ARE ACCEPTED [user = ${user.name}, user_id = ${user.id}, apt = ${apt_id}, by = ${ctx.user.name}]`, result);
				return ctx.bot.telegram.sendMessage(data.chat.id, "Ваш ДДУ принят, и регистрация подтверждена. Теперь вы в списке самых настоящих соседей ЖК Пресня Сити! Ура!").then(() => {

					return ctx.reply('Acceptance: Done.');
				});
			});
		});
	});
};



function mw_reject_documents(ctx, next) {

	if (!ctx.update.callback_query.message.text) return next(ctx);

	let data = JSON.parse(ctx.update.callback_query.message.text);
		data.callback = { data: ctx.update.callback_query.data, by: ctx.from };

	trace.info("GOING TO REJECT DOCS", data, ctx.user);

	return ctx.bot.telegram.sendMessage(data.chat.id, `Извиняюсь, но документы не приняты :(\nСпокойствие, только спокойствие!... Давайте напишем о произошедшем ${support}`).then(() => {

		return ctx.reply('Rejection: Done.');
	});
};



function mw_menu(ctx, next, msg = "Чем могу быть полезен?") {

    console.log('MW_MENU with msg=', msg);

    if (!ctx.isPrivate) {

        console.log('\n\nMW_MENU - DELETE MSG')
        return ctx.deleteMessage()
    }

    return ctx.reply(msg, Markup.inlineKeyboard([

        [ Markup.callbackButton("Соседи по этажу", "/floor") ],
        [ Markup.callbackButton("Соседи по стояку", "/stack") ],
        [ Markup.callbackButton("Добавить квартиру", "/join") ],
        [ Markup.callbackButton("Закрытый чат", "/confirm") ],
        [ Markup.callbackButton("Список всех чатов Пресня Сити", "/chats") ],
		[ Markup.callbackButton("Помыть окна альпинистами", "/okna") ]

    ]).extra());

    /*
        [ Markup.loginButton('Помыть окна альпинистами', 'https://presnya.shop/login') ]
    */
}





function mw_menu_short(ctx, next, msg = "Чем могу быть полезен?") {

    if (!ctx.isPrivate) {

        console.log('\n\nMW_MENU_SHORT - DELETE MSG')
        return ctx.deleteMessage()
    }

    return ctx.reply(msg, Markup.inlineKeyboard([

        [ Markup.callbackButton("Помыть окна альпинистами", "/okna") ],
        [ Markup.callbackButton("Всё меню", "/menu") ]

    ]).extra())
}





function mw_help(ctx, next) {

	return mw_menu(ctx, next, `Если возникнут сложности, или посетит идея, или одолеет чувство нехватки какого-то функционала - смело пишит Федору: ${support}\n\nМеню:`);
};



function mw_confirm(ctx) {

	return ctx.privateReply(BOT_MSG_HOWOT_CONFIRM);
}



function mw_intoduction_new(ctx) {

	return ctx.reply(
		"Привет, сосед! Я бот, который поможет найти ваших соседей в ЖК Пресня Сити. Для начала, давайте зарегистрируемся в шахматке. Просто отправьте мне номер своей квартиры. Я его никому не скажу. Соседи будут знать ваш этаж и башню, но не номер квартиры.",
		 Markup.keyboard(['Меню']).resize().extra()
	);
};



function mw_intoduction_existing(ctx, next, apts) {

		return ctx.replyWithHTML(
			`Приветствую!\nУ вас уже есть зарегистрированн${apts.length == 1 ? 'ая':'ые'} в шахматке квартир${apts.length == 1 ? 'а':'ы'}:\n<b>${apts.map(i => i.id).join(', ')}</b>\nВы можете зарегистрировать еще одну (как обычно, отправив мне её номер), или же приступить к поиску соседей с помощью меню:\n${BOT_MENU}`,
			 Markup.keyboard(['Меню']).resize().extra()
		);
};



function mw_welcome(ctx, next) {

	return next(ctx);

	if (ctx.chat.id == -1001496098878 || ctx.chat.id == -1001214733932) {

		return ctx.db
			.query_one('select sum(apts.size()) as count from wash_budget_2020_03')
			.then(result => (result.link = ctx.user.link) && (result.parameter = 'квартир' + (['','a','ы','ы','ы'][result.count % 10] || '')) && result)
			.then(result => messages.welcome(ctx).with(result).say())
	}

	return next(ctx);
}



function mw_me(ctx) {

	return ctx.user.apartments.then(apts => {

		return ctx.replyWithHTML(`
<b>${ctx.user.name}</b>

${apts.length > 1 ? 'квартиры:' : 'квартира:'}${apts.reduce((rv, x) => {return `${rv}\n<b>${x.id}</b> (${x.windows.length} окон, ${x.floor} эт, ${x.tower.name})` }, "")}${apts.length < 1 ? ' данные отсутствуют' : '' }

Если не хватает какой-то квартиры, то просто отправьте мне её номер, и я добавлю её в ваш профиль.
Если есть лишние номера или какая-то другая проблема, пожалуйста, обратитесь к @fedor_presnya, и он всё поправит.
`
		);
	});

    return ctx.user.apartments.then(apts => {

		return ctx.replyWithHTML(`
<b>${ctx.user.name}</b>
id: ${ctx.user.id}
first name: ${ctx.user.firstname}
last name: ${ctx.user.lastname}
link: ${ctx.user.link}
data: ${JSON.stringify(ctx.user['@data'], null, "\t")}
property:${apts.reduce((rv, x) => {return `${rv}\n<b>${x.id}</b> (${x.floor} эт, ${x.tower.name})` }, "")}`
		);
	});
};



function mw_unknown_message_reply(ctx, next) {

	if (!ctx.update.callback_query.message.text) return next(ctx);

	trace.info("GOING TO REPLY TO USER VIA BOT", ctx.update.callback_query.message);

	let data = JSON.parse(ctx.update.callback_query.message.text);
		data.callback = { data: ctx.update.callback_query.data, by: ctx.from };

	ctx.session.reply = data;
	return ctx.scene.enter('reply');
};



function mw_archive(ctx, next) {

	return next(ctx).then(() => {

		if (ctx.from.id == USR_ZOTOV) return ctx.user.save_zotov(ctx.update.message).catch(trace.error);
		if (ctx.from.id == USR_NICKY) return ctx.user.save_nicky(ctx.update.message).catch(trace.error);
	
	}).then(() => {

		if (ctx.update.message && ctx.update.message.entities) {

			return ctx.update.message.entities.filter(x => x.type == 'text_mention').reduce((rv, i) => {

				return rv.then(() => {

					if (i.user.id == USR_ZOTOV) return ctx.user.save_zotov(ctx.update.message).catch(trace.error);
					if (i.user.id == USR_NICKY) return ctx.user.save_nicky(ctx.update.message).catch(trace.error);
				});

			}, Promise.resolve());
		}

	}).then(() => {

		return ctx.update.message && !CHT_SYST.includes(ctx.chat.id) ? ctx.user.save_archive(ctx.update.message) : undefined;
	});
}



function mw_spam_filter(ctx, next) {

	try {

		let msg = ctx.update.message;

		if (msg && msg.forward_from_chat && ((msg.caption && msg.caption.includes('https://t.me/joinchat/')) || (msg.text && msg.text.includes('https://t.me/joinchat/')))) {

			trace.info("SPAM", msg);

			return ctx.bot.telegram.deleteMessage(ctx.chat.id, msg.message_id).catch(trace.error).then(success => {

				if (!success) return ctx.replyTo('spam! не могу удалить, нет прав :(');
				return success;
			});
		}

		return next(ctx);
	}

	catch {

		return next(ctx);
	}
}



function mw_start_registration(ctx, next) {

	if (!ctx.isPrivate) return next(ctx);
	let id = 1*ctx.message.text.match(REX_APP2).reduce((rv, i) => { if (rv && rv.length > i.length) return rv; return i }, "");

	//252944470 - Николай
	//741608 - Алина Биктимирова
	//376662903 - Кудымова
	//414971388 - Анастасия Хазиева
	//505891600 - Лурье
	//194212976 - Илья

	if (Date.now() < 1665871200000) {

		if ([252944470, 741608, 376662903, 414971388, 505891600, 194212976, 202234105].includes(ctx.user.id)) {

			return ctx.db
				.query(`select id, floor, tower.name, in('owned'):{id, username, firstname, lastname, @rid} as owners from apartment where id = ${id}`)
				.then(result => Promise.all(

						result.map(apt => {

							if (apt.owners.length > 0) {

								return ctx.reply(
									`<b>Кв. ${apt.id}</b>\n\n`
										+ (apt.owners.filter(i => i.username).map(i => `@${i.username}\n\n`).join(''))
										+ toText(apt.owners.filter(i => !i.username), '<a href="tg://user?id={id}">{username:{$} (}{firstname:{$} }{lastname:{$}}{username:)}</a>\n\n')
									, Extra.HTML()
								)
							}

							return ctx.reply("Нет данных :(")
						})

					)
					.catch(err => ctx.reply("Случилась ошибка: " + err && (err.message || err.toString()) || "(неизвестная)" ))
				)
		}
	}

	ctx.session.reg = { id }
	ctx.scene.enter('reg-confirm')
}



function mw_user_info(ctx) {

	if ([252944470, 741608, 376662903, 414971388, 505891600, 194212976, 202234105].includes(ctx.user.id)) {

		if (ctx.message && ctx.message.forward_from) {

			console.log("\n\n\nFORWARD:", ctx.message.forward_from, "\n\n\n")
			const user = ctx.message.forward_from.id

			if (user) {

				return ctx.db
					.query(`select out('owned'):{id, floor, tower:{name}} as apt from user where id=${user}`)
					.then(profile => {

						if (Array.isArray([profile])) {

							profile = profile[0]
						}

						if (!profile) {

							return ctx.reply('Ошибка при загрузке профиля: результат пустой')
						}

						if (profile.err) {

							if (profile.err == 2) {

								return ctx.reply('У пользователя нет зарегистрированных за ним квартир в @PresnyaBot')
							}

							return ctx.reply(`Ошибка при загрузке профиля.\nНомер ошибки: ${profile.err}\n(${profile.description})`)
						}

						console.log("\n\n\nPROFILE:", profile, "\n\n\n")
						return ctx.reply(profile.apt.map(i => `<b>кв. ${i.id}</b> (${i.tower.name}, ${i.floor} эт)`).join("\n\n"), Extra.HTML());
					})
			}
		}

		return ctx
			.reply('Неизвестный формат сообщения. Скорее всего, пользователь запретил сохранять ссылку на себя при форваред сообщений')
			.then(() => trace.info('FORWARD MESSAGE WRONG FORMAT', ctx.update))
	}
}



function mw_request_registration(ctx, next) {

	if (!ctx.isPrivate) return next(ctx);
	ctx.scene.enter('reg-input');
}



function mw_money_offer(ctx) {

	return ctx.user.make_offer(MNY_SUMM, MNY_DISP).then(offer => {

		if (offer.recieved) {

			return ctx.privateReply(`Спасибо! Ваш взнос получен администратором закрытого чата: ${offer.recieved_by.link}\n\nЕсли вас еще не добавили в чат, можете написать мне об этом.`);
		};

		return ctx.privateReply(BOT_MSG_LAWYER_WAITING_FOR_PAYMENT).then(() => {

			return ctx.privateReply(`Ваш уникальный размер взноса:\n<b>${offer.amount} руб.</b>\n\nПожалуйста, переведите именно эту сумму, с точностью до копеечек. Иначе я не смогу понять, от кого пришли деньги.`);

		}).then(() => {

			return ctx.bot.telegram.sendMessage(
				CHT_CASH,
				`Ожидается взнос в размере:\n<b>${offer.amount}</b>\nот пользователя: ${ctx.user.link}`,
				Extra.HTML().markup(m => m.inlineKeyboard([m.callbackButton('пришло на мою карту', `{"recieve-money":{"id":${offer.id}}}`)]))
			);
		});

	}).then(() => {

		if (ctx.chat.type != 'private') {

			return ctx.replyAutoDeleteTo("Отправил информацию Вам в личку.");
		};
	});
};



function mw_money_recieve(ctx) {

	let offer = JSON.parse(ctx.update.callback_query.data)["recieve-money"];

	trace.info("GOING TO RECIEVE MONEY", offer, ctx.user);
	return ctx.user.take_credit(offer.id).then(result => {

		if (result && result.success) {

			return Promise.all([
				ctx.editMessageReplyMarkup().catch(trace.error),
				ctx.editMessageText(ctx.update.callback_query.message.text + `\n\n<b>Зачислено:</b> ${ctx.user.link}\n${new Date()}`, Extra.HTML()).catch(trace.error),
				ctx.replyWithHTML(`На карту ${ctx.user.link} поступил взнос <b>${result.offer.amount}</b> от ${result.creditor.link}.\nПожалуйста, пригласите нового соседа в чат.`).catch(trace.error).then(() => {
					let cash = result.cash.reduce((rv, i) => {return rv + `\n${i.link} => ${i.credit}`}, `Касса: <b>${result.cash.reduce((rv, i) => {return rv + i.credit}, 0)}</b> руб.\n`);
					return ctx.replyWithHTML(cash);
				}).catch(trace.error),
				ctx.bot.telegram.sendMessage(result.creditor.id, `Ваш взнос ${result.offer.amount} руб поступил на карту администратора: ${ctx.user.link}. В ближайшее время он пригласит Вас в чат.`, Extra.HTML()).catch(trace.error)
			]);
		}

		return ctx.reply(`Не получилось принять деньги :(\n[offer.id = ${offer.id}]`);
	});
}



function mw_money_cash(ctx, next) {

	if (ctx.chat.id === CHT_LAWR || ctx.chat.id === CHT_CASH) {

		return ctx.db.query(`select *, $c as credit from user let $c=sum(in("credit").id) where in_credit.size()>0 order by $c desc`).then(result => {

			result = result.reduce((rv, i) => {return rv + `\n${i.link} => ${i.credit/100}`}, `Касса: <b>${result.reduce((rv, i) => {return rv + i.credit}, 0)/100}</b> руб.\n`);
			return ctx.replyWithHTML(result);
		});
	};

	return next(ctx);
}



function mw_get_protection(ctx) {

	return ctx.db.query('select from film where claimed_by is not null').then(claims => {

		if (claims.length >= 80) {

			return ctx.reply('Защитные пленки уже закончились! Спасибо всем, кто принял участие.');
		}

		return ctx.db.query(`select @rid as _rid, id, floor, tower.name as tower, claimed_by.id as user from film where tower in (select tower from (select expand(out('owned')) from ${ctx.user._rid})) order by tower, floor desc`).then(films => {

			if (films.filter(i => {return !i.user}).length < 1) {

				return ctx.reply('В вашей башне все этажи уже расписаны!');
			}

			if (films.filter(i => {return i.user == ctx.user.id}).length >= 5) {

				return ctx.reply('у Вас уже достаточно много наклеек забронировано. Давайте другим этажам и башням тоже оставим :)');
			}

			return ctx.reply('Выберите этаж, на котором Вы готовы наклеить защитную пленку:',

				Markup.inlineKeyboard(

					films.map(i => {

						if (i.user) {

							return [Markup.callbackButton(`${i.floor} эт. - уже забронирована`, 'none')]
						}
						else {

							return [Markup.callbackButton(`${i.floor} эт. (${i.tower})`, `{"film":{"id": ${i.id}, "rid": "${i._rid}"}}`)]
						}
					})

				).extra()
			);
		});
	});
}



function mw_kick_kbk(ctx, next) {

	if ((ctx.user.id == 861155720) || (ctx.user.id == 696690338)) {

		if (ctx.isPrivate) {

			return ctx.reply('[[[НЕИЗВЕСТНАЯ ОШИБКА]]] на сервере произошел неизвестный сбой. Пожалуйста, повторите попытку позже');
		}

		return ctx.bot.telegram.kickChatMember(ctx.chat.id, ctx.user.id).catch(trace_err(ctx.chat, ctx.user)).then(() => ctx.deleteMessage());
	}

	return next(ctx);
}



function mw_hide_leaving(ctx, next) {

	return ctx.deleteMessage().catch(trace_err(ctx.chat, ctx.user));
}



function mw_hide_kick(ctx, next) {

	if (ctx.user.id == 721787346) {

		return ctx.deleteMessage().catch(trace_err(ctx.chat, ctx.user));
	}

	return next(ctx);
}



function mw_kick_out(uid, cid) {

	return (ctx) => {

		return ctx.db.select({from: 'chat'}).then(chats => {

			return chats.filter(i => cid == 'all' || cid == i.id).reduce((rv, i) => {

				return rv.then(() => {

					return ctx.bot.telegram.kickChatMember(i.id, uid).then(() => {

						return ctx.bot.telegram.sendMessage(CHT_ATTN, `KICK-OUT:\nuser: ${uid}\nfrom chat: ${i.id} (${i.title})`);
					
					}, err => {

						return ctx.bot.telegram.sendMessage(CHT_ATTN, `FAILURE TO KICKOUT: ${err}\nuser: ${uid}\nfrom chat: ${i.id} (${i.title})`);
					});

				}).catch(trace.error);

			}, ctx.bot.telegram.sendMessage(CHT_ATTN, JSON.stringify(chats, null, "\t")));
		})
	}
}



function mw_cms_remove(ctx) {

	let data = JSON.parse(ctx.update.callback_query.message.text);
	trace.info('REMOVING CMS ITEM', data);

	/* ATTENTION! - needs to be updated to new WEBFLOW MW */

	return ctx.web.wf.cms_hide_remove(data[1]._cid, data[1]._id)
		.then(() => ctx.reply(`CMS ITEM REMOVE: success\n(item: ${data[1].name})`))
		.catch(err => ctx.reply(`CMS ITEM REMOVE: failure\n(err: ${toString(err)})`));
}



function mw_cms_unhide(ctx) {

	let data = JSON.parse(ctx.update.callback_query.message.text);
	trace.info('UNHIDING CMS ITEM', data);

	/* ATTENTION! - needs to be updated to new WEBFLOW MW */

	return ctx.web.wf.cms_unhide(data[1]._cid, data[1]._id)
		.then(() => ctx.reply(`CMS ITEM UNHIDE: success\n(item: ${data[1].name})`))
		.catch(err => ctx.reply(`CMS ITEM UNHIDE: failure\n(err: ${toString(err)})`));
}



function stat(ctx) {

    console.log("\n\nMIDDLEWARE: STAT");

    return Promise.all(

		[
			'select count(*) as users from user where out_owned.size()>0',
			'select count(*) as apts from apartment where in_owned.size()>0',
			'select sum(size) as size from apartment where in_owned.size()>0'
		]
        .map(i => ctx.db.query_one(i).then(res => {

            console.log(`\n\nQ.RESPONSE: ${JSON.stringify(res, null, '\t')}\nDATA: ${JSON.stringify(res['@data'], null, '\t')}`);
            return ctx.reply(JSON.stringify(res['@data'] || res, null, '\t'));

        }, err => err))
    )
    .then(result => ctx.reply(JSON.stringify(result, null, "\t")));
}



function this_chat(ctx) {

    return ctx.reply(toString(ctx.chat))
        .then(() => ctx.db.select({from: 'chat', where: {id: ctx.chat.id}}))
        .then(res => res.length > 0 ? null : ctx.db.insert('chat', ctx.chat));
}





function mw_send_correction(ctx) {

	let nCount = 0

	return ctx.db
		.query('select *, user.id as chat, apts.id as apt_ids from wash_budget_2020_03 where budget/window_count < 1000 and budget <= 2000')
		.then(requests => Promise.allSettled(

			requests.map(i => messages
				.wash_windows_budget_correction(ctx)
				.with(i)
				.keyboard({v: i.budget})
				.send(i.chat)
				.then(() => ++nCount)
				.catch(trace.error_with(i))
			)
		))
		.then(() => ctx.reply(`Done: ${nCount} messages`))
}


function mw_budget_correction_total(ctx) {

	return ctx
		.editMessageReplyMarkup()
		.then(() => ctx.reply('Oк! Ваш ответ принят: "за всю квартиру".\n\nСпасибо!'));
}


function mw_budget_correction_single(ctx) {

	let data = decode_callback(ctx)
		data = data && data.data && data.data.v

	if (data > 0) {

		return ctx.user
			.correct_wash_budget(data)
			.then(() => ctx.editMessageReplyMarkup())
			.then(() => ctx.reply('Oк! Ваш ответ принят: "за 1 окно".\n\nСпасибо!'))
			.catch(trace.error)
	}

	return ctx.reply("Упс... какая-то ошибка.").finally(() => trace.error(data, ctx.message));
}



function mw_broadcast_preview(ctx) {

	let tag = ctx.message.text && ctx.message.text.match(/\/\w+\s(\w+)/)
		tag = tag && tag[1]
	
	if (tag) {

		return ctx.db
			.select_one({select: "*, users.size() as user_count", from: CLASSES.BROADCAST, where: {id: tag}})
			.then(msg => msg || ctx.reply('NOT FOUND'))
			.then(msg => msg && msg.id && msg.text && messages
				.broadcast_preview(ctx)
				.with(msg)
				.keyboard({id: tag})
				.say()
			)
	}
}





function mw_broadcast(ctx) {

	let cb = decode_callback(ctx);
	let tag = cb && cb.data && cb.data.id;

	if (tag) {

        setTimeout((db, tg, tag) => db
            .select_one({select: "*, users.id as targets", from: CLASSES.BROADCAST, where: {id: tag}})
            .then(msg => tg.sendMessage(202234105, `STARTING broadcast tag=${tag}`).then(() => msg))
            .then(msg => broadcast(tg, msg))
            .then(({result, err}) => {

                trace.info(result)
                if (err) trace.error(err)                
                return Promise.allSettled([
                    tg.sendMessage(202234105, `DONE.\n\nOK = ${result.count_ok}\nERR = ${result.count_err}`),
                    db.insert(CLASSES.JOB_REPORT, result).then(console.log, trace.error)
                ])
            })
            .catch(trace.error)

        , 1000, ctx.db, ctx.bot.telegram, tag)

        return ctx.reply('ok, accepted: ' + tag)
	}

	return ctx.reply(`TAG IS NOT DEFINED`)
}





function mw_wash_confirmatiom(ctx) {

    return ctx.reply('Спасибо за ваш ответ! Данный опрос закрыт, так как утратил свою актуальность.')
}





function mw_wash_vote_antirain(ctx) {

    let answer = ctx.update.callback_query.data.split(':')[1]

    if (answer === 'yes' || answer === 'no') {

        return ctx.db
            .command(`update wash_budget_2020_03 set vote_antirain="${answer === 'yes' ? true : false}" where id=${ctx.user.id}`)
            .then(() => {

                ctx.editMessageReplyMarkup();
                return ctx.reply(`Ок, спасибо! Ваш ответ принят.\n\n${ answer === 'yes' ? 'Я буду иметь вас в виду, если от подрядчика поступит КП на обработку антидождём' : '(ответ: "антидождь не интересен")' }`);
            })
            .catch(err => {

                trace.error(err);
                return ctx.reply(`Упс!... какая-то ошибка возникла: ${JSON.stringify(err)}`)
            })
    }

    return ctx.reply('Упс... какая-то ошибка: такой ответ оказался неожиданным. Сообщите об этом, пожалуйста, @fedor_presnya - ему интересно будет узнать об этом.')
}





function mw_wash_broadcast(ctx) {

    const keyboard = Markup.inlineKeyboard([
      Markup.urlButton('Договор и оплата', `http://bot-sosed.herokuapp.com/request/${ctx.user.id}`)
    ])

    return ctx.db
        .query(`select from wash_budget_2020_03 where uniq_pay_id = 111`)
        .then(reqs => Promise.all(reqs.map(i => ctx.reply('Для получения догвора и оплаты вашего участия в мойке окон нажмите на кнопку: ', Extra.markup(keyboard)))))
}





function mw_alp_contacts(ctx) {

    let cmd = ctx.update.message.text.match(/^[\\/а-яc]+\s*(\d+)/i)
    let track = cmd && cmd[1]
    let tower = "#13:0"

    if (track) {

        return ctx.db
            .query(`select user:{@rid, *, !out_*, !in_*}, apts:{@rid, *, !out_*, !in_*}, apts.tower.name as tower, apts.windows as windows, apts.floor as floor from (select user, apts from wash_budget_2020_03 where money_received = true unwind apts) where apts.tower = ${tower} and ${track} in apts.windows order by floor desc`)
            .then(result => result.map(i => {i.user = new oUser(ctx.db, i.user); return i}))
            .then(result => {

                return ctx.reply(`<b>Виска ${track}</b>\n\n` + toText(result, `<b>{floor} эт.:</b> {user:{link}}\n\n`), Extra.HTML())

            }).catch(err => {

                return ctx.reply(`Error: ${err}`);
            });
    }

    return ctx.reply('Нужен номер виски');
};





function mw_santa(ctx) {

    return ctx.db
        .query(`select from santa where id = ${ctx.user.id}`)
        .then(r => r.length && mw_santa_get || say(Date.now() < Date.parse("2020-12-30 15:00:00 GMT+3") ? 'santa_invitation' : 'santa_is_over', null, {}))
        .then(action => action(ctx))
}





function mw_santa_sendout_reminder(ctx) {

    return ctx.db
        .query(`select id from santa let $p = (select from santa where peer_id = $parent.$current.id) where $p.size() < 1`)
        .then(u => u.map(i => i.id))
        .then(u => messages
                    .santa_reminder(ctx)
                    .keyboard({})
                    .broadcast(u)
                    .then(() => trace.info('SANTA REMINDER', u))
                    .catch(trace.error_with(u)))
        .catch(trace.error)
}





function mw_santa_get(ctx) {
    
    console.log('mw_santa_get')

    return ctx.db
        .santa_get_peer(ctx.user)
        .then(peer => messages.santa_peer(ctx).with(peer).say())
        .catch(err => {

            trace.error(err, ctx.user);
            return ctx.reply('Упс! Какая-то ошибка произошла :(\nПопробуйте еще раз, и если совсем не получается, то напишите @fedor_pavlov')
        })
}





function mw_santa_clear(ctx) {

    return ctx.editMessageReplyMarkup();
}





function mw_santa_sendout_ready_buttons(ctx) {

    return ctx.db
        .query(`select id from santa`)
        .then(u => u.map(i => i.id))
        .then(u => messages
                    .santa_ready_button(ctx)
                    .keyboard({})
                    .broadcast(u)
                    .then(() => trace.info('SANTA READY BUTTON', u))
                    .catch(trace.error_with(u)))
        .catch(trace.error)
}





function mw_santa_ready(ctx) {

    return ctx.db
        .query_one(`select user:{*}, user.out_owned[0].in:{id, tower:{name}} as apt from santa where peer_id = ${ctx.user.id}`)
        .then(u => { u.user = new oUser(ctx.db, u.user); return u})
        .then(u => messages
                .santa_gift_is_waiting(ctx).with(u).send(u.user.id)
                .then(() => messages.santa_thankyou(ctx).with(u).say())
                .then(() => ctx.editMessageReplyMarkup())
                .then(() => trace.info('SANTA GIFT IS READY', { from: ctx.user, to: u.user })))
        .catch(trace.error)
}





function mw_login(ctx) {

    console.log('Login test')
    return ctx.reply('Say hi!', Extra.markup(m => m.inlineKeyboard([[ m.loginButton('Оформить заявку', 'https://presnya.shop/login') ]])))
}





function mw_wash_windows(ctx) {

    /*
    return ctx.reply(
        `Летняя мойка окон уже завершена. Она длилась с июня по июль. Следующая планируется на 6-е сентября, а сбор предзаказов начнётся в августе. Следите за объявлением вот тут: @presnya_city_news`
    )*/

    /*
    return ctx.reply(
        `Осенняя мойка окон уже завершена. Она проводилась с сентября по октябрь. Следующая планируется на весну 2022 года, как только позволят погодные условия. Сбор заказа начнётся в марте 2022. Следите за объявлением в новостном канале: @presnya_city_news`
    )*/

    return ctx.db
        .query(`select expand(set(out("owned"))) from user where id=${ctx.user.id}`)
        .then(apts => { trace.info(apts); return apts })
        .then(apts => ctx.reply(
            `Мойка окон с внешней стороны силами альпинистов летом 2022:\n\n${apts.length > 1 ? 'Ваши квартиры:' : 'Ваша квартира:'}${apts.reduce((rv, x) => `${rv}\n<b>${x.id}</b> (${x.windows.length} окон, ${x.floor} эт)`, '')}\n\nДаты проведения работ:\n<b>06.06-19.06:</b> Центральная башня\n<b>20.06-03.07:</b> Западная башня\n<b>04.07-17.07:</b> Восточная башня\n\nЧтобы оформить заказ, оплатить счет или проверить текущий статус вашего заказа, нажмите на кнопку "Оформить заказ" под этим сообщением. Если по каким-то причинам кнопка не работает, то можно зайти на страничку https://presnya.shop`,
             Extra.HTML().markup(m => m.inlineKeyboard([[ m.loginButton('Оформить заказ', 'https://presnya.shop/login') ]]))
        ))
}





function mw_unknown_message(ctx, next) {

	if (!ctx.isPrivate) return next(ctx);

	return mw_menu(ctx, next).then(() => {

		trace.info(`UNKNOWN MESSAGE [from = ${ctx.user.name}]`, ctx.user, ctx.update.message);

		return ctx.bot.telegram.sendMessage(
			CHT_ATTN,
            JSON.stringify({

				ts: Date.now(),
				message: ctx.update.message.message_id,
                text: ctx.update.message.text,
				sender: ctx.update.message.from,
				chat: ctx.update.message.chat,
				photo: ctx.update.message.photo && ctx.update.message.photo.reduce((rv, x) => { if (rv.file_size && rv.file_size > x.file_size) return rv; return x }, {})

			}, null, "\t"),
			Markup.inlineKeyboard([[Markup.callbackButton('ответить', 'reply')]]).extra()
		);
	});
}





function mw_window_show_contact(ctx) {

    let track = ctx.message.text.match(/^\s*\d{3}\s|\s\d{3}\s*$/);
    let floor = ctx.message.text.match(/^\s*\d{1,2}\s|\s\d{1,2}\s*$/);

    if (track && floor) {

        track = track[0].trim()
        floor = floor[0].trim()

        trace.info('REQUEST FOR CONTACT', { track, floor })

        return ctx.db
            .query(`select expand(clean_windows_get_contact(${track}, ${floor}))`)
            .then(contacts => {

                if (!Array.isArray(contacts) || contacts.length < 1) {

                    return ctx.reply(`Контакт для этажа ${floor} на виске ${track} на найден`)
                }

                return Promise.all(

                    contacts.map(i => messages.window_customer_contact(ctx).with(i).say().catch(trace.error))
                )
            })
            .catch(err => {

                trace.error('REQUEST FOR CONTACT', err)
                return ctx.reply(`Случилась ошибка:\n\n${JSON.stringify(err)}`)
            })
    }

    return mw_unknown(ctx);
}