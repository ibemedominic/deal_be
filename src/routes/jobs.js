const express = require('express');
const { Op } = require('sequelize');
const {getProfile } = require('../middleware/getProfile');
const router = express.Router();

/**
 * This file contains all the routes for the jobs.
 */


/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 */
router.post('/:job_id/pay', getProfile, async function(req, res)
{
    const profile = req.profile;
    if(profile == null)
    {
        return res.status(401).json("UnAuthorized").end()
    }
    
    const {Job, Profile, Contract } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const {job_id} = req.params;

    let errorCode = null, errorMessage = null;
    const txn = await sequelize.transaction();
    
    try 
    {
        const job = await Job.findOne({
            where: {
                id : job_id
            },
            include: [{
                model: Contract,
                include: [{
                    model: Profile,
                    as: 'Client'
                }, {
                    model: Profile,
                    as: 'Contractor'
                }]
            }]
        });
    
        if(job == null)
        {
            errorCode = 401;
            errorMessage = "Job Not Found";
        } else if(job.Contract.Client.id != profile.id)
        {
            errorCode = 401;
            errorMessage = "Access Denied";
        } else if(job.Contract.Client.balance < job.price)
        {
            errorCode = 400;
            errorMessage = "Insufficient Balance";
        }
        if(errorCode != null)
        {
            await txn.rollback();
            return res.status(errorCode).json(errorMessage).end();
        }
    
        const client = await Profile.findOne({where: {id: job.Contract.Client.id }});
        const contractor = await Profile.findOne({where: {id: job.Contract.Contractor.id }});

        const amount = job.price;
        client.balance -= amount;
        contractor.balance += amount;
        job.paid = true;
        job.paymentDate = new Date();

        client.save();
        contractor.save();
        job.save();

        // If the execution reaches this line, no errors were thrown.
        // We commit the transaction.
        await txn.commit();
        return res.status(200).json(job).end();

    } catch (error) {

        // If the execution reaches this line, an error was thrown.
        // We rollback the transaction.
        await txn.rollback();
        return res.status(400).json(error.message).end();
    }

});


/**
 * Get all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only***.
 */
router.get('/unpaid', getProfile, async function(req, res)
{
    const profile = req.profile;
    if(profile == null)
    {
        return res.status(401).json("UnAuthorized").end()
    };
    const user = profile.id;
    const {Job, Contract } = req.app.get('models');

    const jobs = await Job.findAll({
        where: {
            paid : {
                [Op.not] : true
            }
        },
        include: [{
            model: Contract,
            where: {
                [Op.or]: [
                    { ClientId: user },
                    { ContractorId: user }
                ],
                status: 'in_progress'
            }
        }]
    });

    return res.status(200).json(jobs).end();
});


module.exports = router;
