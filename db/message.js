////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const oRecord               = require("../../../odb/oRecord");





module.exports = class oMessage extends oRecord {

    constructor() {

        super(...arguments);
    }

    get author() {

        let sender = this.sender;
        let fname = (sender.first_name || sender.firstname || '').trim();
        let lname = (sender.last_name  || sender.lastname  || '').trim();
        let uname = (sender.username   || '').trim();
        let name  = [fname, lname].join(' ');
        switch (name.length) {
            case 0: return uname ? `@${uname}` : `аноним (${sender.id})`;
            case 1: return uname ? `@${uname}` : `${name} (${sender.id})`;
            default: return name;
        }
    }

    get author_link() {

        return this.sender.username ? `@${this.sender.username}` : `<a href="tg://user?id=${this.sender.id}">${this.from}</a>`;
    }

    get_html() {

        return `<i>от: </i>${this.from_link}\n<i>чат: ${this.chat.title}</i>\n\n${this.text}`;
    }

    get_text() {

        return `от: ${this.from}\nчат: ${this.chat.title}\n${this.text}`;
    }
}