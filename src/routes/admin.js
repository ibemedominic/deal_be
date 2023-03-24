const express = require('express');
const { Op, col, fn, literal, QueryTypes } = require("sequelize");
const router = express.Router();

/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 */
router.get('/best-profession', async function(req, res)
{
    const {Contract, Profile, Job } = req.app.get('models');
    const { start, end } = req.query;

    let astart = new Date(start);
    let aend = new Date(end);
    console.log('parsed date  = ' + astart);

    const contracts = await Contract.findAll({
        attributes: [
            "id",
            [ col('Contractor.id'), 'userId'],
            [ col('Contractor.profession'), 'profession'],         
            [ fn('SUM', col('jobs.price')), 'amount'],
        ],
        include: [{
            model: Profile,
            as: 'Contractor'
        }, {
            model: Job,
            where: {
                createdAt : 
                {
                    [Op.between]: [start, end]
                },
                paid : true
            }
        }]
    });

    // sum all contractor contracts
    let profileMap = new Map();
    let currentProfile = null;
    contracts.forEach((entry)=>
    {
        const { userId, profession, amount } = entry.dataValues;
        currentProfile = profileMap.get(userId);

        if(currentProfile == null)
        {
            currentProfile = { userId : userId, profession : profession, amount : amount };
            console.log(JSON.stringify(currentProfile));
            profileMap.set(userId, currentProfile);
        } else {
            currentProfile.amount += amount;
        }
    });
    
    let best = null;
    profileMap.forEach((value, key)=>
    {
        if(best == null)
        {
            best = value;
        } else if(best.amount < value.amount)
        {
            best = value;
        }
    });

    let profession = '';
    if(best != null)
    {
        profession = best.profession;
    }
    return res.status(200).json(profession).end();

});


/**
 * returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
 */
router.get('/best-clients', async function(req, res){
    
    const {Contract, Profile, Job } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    let { start, end, limit } = req.query;
    if(limit == null)
    {
        limit = 2;
    }

    let qstart = new Date(start);
    let qend = new Date(end);
    
    let profiles = await sequelize.query(
        ` SELECT clientId as id, sum(paid) as paid,  (p.firstName || ' ' || p.lastName) as fullName 
        FROM 
        (
            SELECT contract.id as cid, contract.clientId as clientId, 
            (select SUM(j.price) from Jobs j where j.ContractId = contract.id) as paid FROM Contracts contract
            left join Jobs jobs on (contract.id = jobs.ContractId) 
            WHERE jobs.paymentDate between :start and :end and jobs.paid = 1  
            group by contract.id, contract.clientId 
        ) as GroupedContract, Profiles p 
        where GroupedContract.clientId = p.id 
        group by id, fullName order by paid desc limit :limit `,
        {
          replacements: { start: qstart, end : qend, limit : limit },
          type: QueryTypes.SELECT
        }
    );

    return res.status(200).json(profiles).end();

});

module.exports = router;
