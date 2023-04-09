////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

module.exports = class oChatInfo {

    constructor(chats) {

        this._chats = chats.reduce((rv, i) => { rv[i.id] = i; return rv }, {});
    }

    tag2id(tag) {

        return Object.values(this._chats).filter(i => i.tags && i.tags.includes(tag)).map(i => i.id);
    }

    chat(id) {

        return this._chats[id] || {};
    }

    isPublic(id) {

        return !this.chat(id).private;
    }

    isPrivate(id) {

        return this.chat(id).private;
    }

    isHidden(id) {

        return this.chat(id).hidden;
    }
}