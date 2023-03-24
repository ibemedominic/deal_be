const express = require('express');
const {getProfile } = require('../middleware/getProfile');
const router = express.Router();

/**
 * This file contains all the routes for the deposit endpoints.
 */


/**
 * Deposits money into the the the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 */
//router.post('/deposit/:userId', getProfile, async function(req, res)
router.post('/deposit/:userId', async function(req, res)
{
    //const profile = req.profile;
    //if(profile == null)
    //{
    //    return res.status(401).json("UnAuthorized").end()
    //}

    const { userId } = req.params;
    //if(userId != profile.id)
    //{
        // Not sure if the requirement validates this, if it does, then the userId parameter was totally unnecessary.
        //return res.status(401).json("Access Denied").end()
    //}

    const {Contract, Profile, Job } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const { amount } = req.body;
    
    const txn = await sequelize.transaction();
    try 
    {
        
        let maxAmount = await Job.sum('price', 
        { 
            include: [{
                model: Contract,
                where: {
                    status : "in_progress",
                    ClientId : userId
                }
            }]
        }); 

        maxAmount = maxAmount * 0.25;  // reduce by 25%
        
        if(amount > maxAmount)
        {
            await txn.rollback();
            return res.status(400).json(`Payment Amount exceeded maximum allowed ${maxAmount}`).end()
        }

        const liveProfile = await Profile.findOne({where: { id: userId }})
        liveProfile.balance += amount;
        await liveProfile.save();
        await txn.commit();
        res.status(200).json(liveProfile).end();

    } catch (error) {

        // If the execution reaches this line, an error was thrown.
        // We rollback the transaction.
        await txn.rollback();
        return res.status(400).json(error.message).end();
    }
});


module.exports = router;
