const express = require('express');
const {getProfile} = require('../middleware/getProfile');
const { Op } = require("sequelize");

const router = express.Router();

/**
 * This file contains all the routes for the contracts.
 */


/**
 * it should return the contract only if it belongs to the profile calling
 */
router.get('/:id', getProfile, async function(req, res) {
    
    const profile = req.profile;
    if(profile == null)
    {
        return res.status(401).json("UnAuthorized").end()
    }
    const {Contract} = req.app.get('models')
    const {id} = req.params
    
    const contract = await Contract.findByPk(id);
    if(contract == null)
    {
        return res.status(404).end();
    }
    
    if((contract.ContractorId != profile.id) && (contract.ClientId != profile.id))
    {
        return res.status(401).json("Access Denied").end()
    }
    res.status(200).json(contract);

});


/**
 * Returns a list of contracts belonging to a user (client or contractor), the list should only contain non terminated contracts.
 */
router.get('/', getProfile, async function(req, res)
{
    const profile = req.profile;
    if(profile == null)
    {
        return res.status(401).json("UnAuthorized").end()
    }
    const {Contract} = req.app.get('models');
    let user = profile.id;
    
    const contracts = await Contract.findAll({
        where: {
          [Op.or]: [
            { ClientId: user },
            { ContractorId: user }
          ],
          status: {
            [Op.not]:  'terminated'
          }
        }
    });

    res.status(200).json(contracts);
});


module.exports = router;

