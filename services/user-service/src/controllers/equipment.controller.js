const databaseService = require('../services/database');
const Joi = require('joi');

class EquipmentController {
    constructor() {
        this.prisma = databaseService.getClient();
    }

    // Validation schemas
    static createEquipmentSchema = Joi.object({
        name: Joi.string().min(2).max(200).required(),
        category: Joi.string().valid(
            'Cameras', 'Lenses', 'Audio Equipment', 'Lighting', 'Stabilizers',
            'Drones', 'Tripods & Supports', 'Monitors', 'Storage & Memory',
            'Accessories', 'Post-Production', 'Other'
        ).required(),
        brand: Joi.string().max(100).optional(),
        model: Joi.string().max(100).optional(),
        description: Joi.string().max(1000).optional(),
        condition: Joi.string().valid('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR').default('GOOD'),
        purchaseDate: Joi.date().iso().optional(),
        purchasePrice: Joi.number().min(0).optional(),
        currentValue: Joi.number().min(0).optional(),
        isAvailable: Joi.boolean().default(true),
        isIncludedInBids: Joi.boolean().default(true),
        specifications: Joi.object().optional(),
        images: Joi.array().items(Joi.string().uri()).default([]),
        lastServiceDate: Joi.date().iso().optional(),
        nextServiceDue: Joi.date().iso().optional(),
        location: Joi.string().max(200).optional(),
        serialNumber: Joi.string().max(100).optional(),
        insuranceValue: Joi.number().min(0).optional(),
        notes: Joi.string().max(500).optional()
    });

    static updateEquipmentSchema = Joi.object({
        name: Joi.string().min(2).max(200).optional(),
        category: Joi.string().valid(
            'Cameras', 'Lenses', 'Audio Equipment', 'Lighting', 'Stabilizers',
            'Drones', 'Tripods & Supports', 'Monitors', 'Storage & Memory',
            'Accessories', 'Post-Production', 'Other'
        ).optional(),
        brand: Joi.string().max(100).optional(),
        model: Joi.string().max(100).optional(),
        description: Joi.string().max(1000).optional(),
        condition: Joi.string().valid('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR').optional(),
        purchaseDate: Joi.date().iso().optional(),
        purchasePrice: Joi.number().min(0).optional(),
        currentValue: Joi.number().min(0).optional(),
        isAvailable: Joi.boolean().optional(),
        isIncludedInBids: Joi.boolean().optional(),
        specifications: Joi.object().optional(),
        images: Joi.array().items(Joi.string().uri()).optional(),
        lastServiceDate: Joi.date().iso().optional(),
        nextServiceDue: Joi.date().iso().optional(),
        location: Joi.string().max(200).optional(),
        serialNumber: Joi.string().max(100).optional(),
        insuranceValue: Joi.number().min(0).optional(),
        notes: Joi.string().max(500).optional()
    });

    // Helper method to synchronize equipmentOwned array
    syncEquipmentOwned = async (userId) => {
        try {
            // Get all equipment IDs for the user
            const equipment = await this.prisma.equipment.findMany({
                where: { userId },
                select: { id: true }
            });

            const equipmentIds = equipment.map(eq => eq.id);

            // Update the user's equipmentOwned field
            await this.prisma.user.update({
                where: { id: userId },
                data: { equipmentOwned: equipmentIds }
            });

            return equipmentIds;
        } catch (error) {
            console.error('Error syncing equipmentOwned:', error);
            throw error;
        }
    };

    // POST /equipment - Create new equipment
    createEquipment = async (req, res) => {
        try {
            const { error, value } = EquipmentController.createEquipmentSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Create equipment
            const equipment = await this.prisma.equipment.create({
                data: {
                    ...value,
                    userId
                }
            });

            // Sync equipmentOwned array
            await this.syncEquipmentOwned(userId);

            res.status(201).json({
                success: true,
                message: 'Equipment created successfully',
                data: equipment
            });
        } catch (error) {
            console.error('Error creating equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // GET /equipment - Get user's equipment with filtering and sorting
    getEquipment = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const {
                category,
                condition,
                isAvailable,
                isIncludedInBids,
                sortBy = 'name',
                sortOrder = 'asc',
                page = 1,
                limit = 50,
                search
            } = req.query;

            const skip = (page - 1) * limit;

            // Build where conditions
            const where = { userId };

            if (category && category !== 'all') {
                where.category = category;
            }

            if (condition) {
                where.condition = condition;
            }

            if (typeof isAvailable === 'string') {
                where.isAvailable = isAvailable === 'true';
            }

            if (typeof isIncludedInBids === 'string') {
                where.isIncludedInBids = isIncludedInBids === 'true';
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { brand: { contains: search, mode: 'insensitive' } },
                    { model: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Validate sort field
            const validSortFields = ['name', 'category', 'brand', 'condition', 'purchaseDate', 'currentValue', 'createdAt'];
            const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';

            // Get equipment
            const [equipment, total] = await Promise.all([
                this.prisma.equipment.findMany({
                    where,
                    orderBy: {
                        [safeSortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc'
                    },
                    skip: parseInt(skip),
                    take: parseInt(limit)
                }),
                this.prisma.equipment.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    equipment,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // GET /equipment/stats - Get equipment statistics
    getEquipmentStats = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const [
                totalItems,
                availableItems,
                categories,
                totalValue,
                avgAge,
                maintenanceDue
            ] = await Promise.all([
                // Total items
                this.prisma.equipment.count({ where: { userId } }),

                // Available items
                this.prisma.equipment.count({
                    where: { userId, isAvailable: true }
                }),

                // Unique categories
                this.prisma.equipment.groupBy({
                    by: ['category'],
                    where: { userId }
                }),

                // Total purchase price
                this.prisma.equipment.aggregate({
                    where: { userId, purchasePrice: { not: null } },
                    _sum: { purchasePrice: true }
                }),

                // Average age calculation
                this.prisma.equipment.findMany({
                    where: {
                        userId,
                        purchaseDate: { not: null }
                    },
                    select: { purchaseDate: true }
                }),

                // Items needing maintenance
                this.prisma.equipment.count({
                    where: {
                        userId,
                        nextServiceDue: {
                            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
                        }
                    }
                })
            ]);

            // Calculate average age in months
            let calculatedAvgAge = 0;
            if (avgAge.length > 0) {
                const now = new Date();
                const totalAgeMonths = avgAge.reduce((sum, item) => {
                    const ageMonths = (now.getFullYear() - item.purchaseDate.getFullYear()) * 12 +
                        (now.getMonth() - item.purchaseDate.getMonth());
                    return sum + ageMonths;
                }, 0);
                calculatedAvgAge = Math.round(totalAgeMonths / avgAge.length);
            }

            const stats = {
                totalItems,
                totalValue: totalValue._sum.purchasePrice || 0,
                availableItems,
                categoriesCount: categories.length,
                avgAge: calculatedAvgAge,
                maintenanceDue
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error fetching equipment stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch equipment statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // GET /equipment/:id - Get specific equipment item
    getEquipmentById = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const equipment = await this.prisma.equipment.findFirst({
                where: { id, userId }
            });

            if (!equipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipment not found'
                });
            }

            res.json({
                success: true,
                data: equipment
            });
        } catch (error) {
            console.error('Error fetching equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // PATCH /equipment/:id - Update equipment
    updateEquipment = async (req, res) => {
        try {
            const { id } = req.params;
            const { error, value } = EquipmentController.updateEquipmentSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if equipment exists and belongs to user
            const existingEquipment = await this.prisma.equipment.findFirst({
                where: { id, userId }
            });

            if (!existingEquipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipment not found'
                });
            }

            // Update equipment
            const updatedEquipment = await this.prisma.equipment.update({
                where: { id },
                data: value
            });

            res.json({
                success: true,
                message: 'Equipment updated successfully',
                data: updatedEquipment
            });
        } catch (error) {
            console.error('Error updating equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // DELETE /equipment/:id - Delete equipment
    deleteEquipment = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if equipment exists and belongs to user
            const equipment = await this.prisma.equipment.findFirst({
                where: { id, userId }
            });

            if (!equipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipment not found'
                });
            }

            // Delete equipment
            await this.prisma.equipment.delete({
                where: { id }
            });

            // Sync equipmentOwned array
            await this.syncEquipmentOwned(userId);

            res.json({
                success: true,
                message: 'Equipment deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // PATCH /equipment/:id/availability - Toggle equipment availability
    toggleAvailability = async (req, res) => {
        try {
            const { id } = req.params;
            const { isAvailable } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (typeof isAvailable !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'isAvailable must be a boolean'
                });
            }

            // Check if equipment exists and belongs to user
            const equipment = await this.prisma.equipment.findFirst({
                where: { id, userId }
            });

            if (!equipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipment not found'
                });
            }

            // Update availability
            const updatedEquipment = await this.prisma.equipment.update({
                where: { id },
                data: { isAvailable }
            });

            res.json({
                success: true,
                message: `Equipment ${isAvailable ? 'marked as available' : 'marked as unavailable'}`,
                data: updatedEquipment
            });
        } catch (error) {
            console.error('Error toggling equipment availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update equipment availability',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // GET /equipment/categories - Get equipment categories with counts
    getCategories = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const categories = await this.prisma.equipment.groupBy({
                by: ['category'],
                where: { userId },
                _count: { category: true }
            });

            const formattedCategories = categories.map(cat => ({
                category: cat.category,
                count: cat._count.category
            }));

            res.json({
                success: true,
                data: formattedCategories
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // POST /equipment/bulk-import - Bulk import equipment from CSV/JSON
    bulkImportEquipment = async (req, res) => {
        try {
            const { equipment } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (!Array.isArray(equipment) || equipment.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Equipment array is required and must not be empty'
                });
            }

            const validationResults = [];
            const validEquipment = [];

            // Validate each equipment item
            for (let i = 0; i < equipment.length; i++) {
                const { error, value } = EquipmentController.createEquipmentSchema.validate(equipment[i]);
                if (error) {
                    validationResults.push({
                        index: i,
                        errors: error.details.map(detail => detail.message)
                    });
                } else {
                    validEquipment.push({ ...value, userId });
                }
            }

            if (validationResults.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation errors in equipment data',
                    errors: validationResults
                });
            }

            // Bulk create equipment
            const createdEquipment = await this.prisma.equipment.createMany({
                data: validEquipment
            });

            // Sync equipmentOwned array
            await this.syncEquipmentOwned(userId);

            res.status(201).json({
                success: true,
                message: `Successfully imported ${createdEquipment.count} equipment items`,
                data: { count: createdEquipment.count }
            });
        } catch (error) {
            console.error('Error bulk importing equipment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to import equipment',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
}

module.exports = new EquipmentController();
