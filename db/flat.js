////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { uniq }              = require('../../../tools');
const { CLASSES }           = require('../constants');
const   oRecord             = require("../../../odb/oRecord");





module.exports = class oFlat extends oRecord {

    constructor() {

        super(...arguments);
        this.$id = this.id;
        this.$floor = this.floor;
        this.$tower = this.tower.name;
    }

    get owners() {

        return this._db.select({select: "expand(inE(:owner).out)", from: this._rid}, {owner: CLASSES.OWNER}).then(result => {

            return uniq(result);
        });
    }

    get neighbours() {

        return this._db.select_neighbours(this._rid);
    }
}