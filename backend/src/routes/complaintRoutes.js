const express = require('express');
const complaintController = require('../controllers/complaintController');
const llmModeration = require('../middlewares/llmModeration');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/submit', authMiddleware.verifyStudent, llmModeration.moderateComplaint, complaintController.submitComplaint);
router.get('/admin/complaints', authMiddleware.verifyAdmin, complaintController.getQuarantinedComplaints);
router.get('/admin/complaints/:id', authMiddleware.verifyAdmin, complaintController.getComplaintById);
router.patch('/admin/complaints/:id/status', authMiddleware.verifyAdmin, complaintController.updateComplaintStatus);
router.post('/admin/complaints/:id/notes', authMiddleware.verifyAdmin, complaintController.addAdminNote);
router.delete('/admin/complaints/:id', authMiddleware.verifyAdmin, complaintController.deleteComplaint);

module.exports = router;
