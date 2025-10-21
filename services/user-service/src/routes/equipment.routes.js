// src/routes/equipment.routes.js
const express = require('express');
const equipmentController = require('../controllers/equipment.controller');

const router = express.Router();

// Equipment routes (gateway handles authentication)
router.post('/', equipmentController.createEquipment);
router.get('/', equipmentController.getEquipment);
router.get('/stats', equipmentController.getEquipmentStats);
router.get('/categories', equipmentController.getCategories);
router.post('/bulk-import', equipmentController.bulkImportEquipment);
router.get('/:id', equipmentController.getEquipmentById);
router.put('/:id', equipmentController.updateEquipment);
router.delete('/:id', equipmentController.deleteEquipment);
router.put('/:id/availability', equipmentController.toggleAvailability);

module.exports = router;
