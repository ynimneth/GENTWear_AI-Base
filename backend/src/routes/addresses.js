const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Address } = require('../config/db');
const auth = require('../middleware/auth');

// Validation rules for addresses
const addressValidation = [
  body('title').trim().notEmpty().withMessage('Address title (e.g. Home, Office) is required'),
  body('full_name').trim().notEmpty().withMessage('Recipient full name is required'),
  body('phone_number').trim().notEmpty().withMessage('Phone number is required'),
  body('address_line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State/Region is required'),
  body('postal_code').trim().notEmpty().withMessage('Postal/ZIP code is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('is_default').optional().isBoolean().withMessage('is_default must be a boolean')
];

// Helper to handle clearing default addresses if the new/updated one is default
const handleDefaultAddress = async (userId, addressId, isDefault) => {
  if (isDefault) {
    await Address.update(
      { is_default: false },
      {
        where: {
          user_id: userId,
          id: { [require('sequelize').Op.ne]: addressId }
        }
      }
    );
  }
};

// GET /addresses - Get all saved addresses for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['createdAt', 'DESC']]
    });
    return res.json(addresses);
  } catch (err) {
    console.error('Fetch addresses error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /addresses - Create a new saved address
router.post('/', auth, addressValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    full_name,
    phone_number,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    is_default = false
  } = req.body;

  try {
    // Check if user has any other addresses. If it's their first, make it default.
    const count = await Address.count({ where: { user_id: req.user.id } });
    const shouldBeDefault = count === 0 ? true : is_default;

    const address = await Address.create({
      user_id: req.user.id,
      title,
      full_name,
      phone_number,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      is_default: shouldBeDefault
    });

    await handleDefaultAddress(req.user.id, address.id, shouldBeDefault);

    return res.status(201).json(address);
  } catch (err) {
    console.error('Create address error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /addresses/:id - Update an existing saved address
router.put('/:id', auth, addressValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    title,
    full_name,
    phone_number,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    is_default = false
  } = req.body;

  try {
    const address = await Address.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If it was default, it must remain default unless another default is set.
    // So if is_default is false but it was previously true, we keep it true if they have no other addresses.
    let updatedDefault = is_default;
    if (address.is_default && !is_default) {
      const otherCount = await Address.count({
        where: {
          user_id: req.user.id,
          id: { [require('sequelize').Op.ne]: id }
        }
      });
      if (otherCount === 0) {
        updatedDefault = true;
      }
    }

    address.title = title;
    address.full_name = full_name;
    address.phone_number = phone_number;
    address.address_line1 = address_line1;
    address.address_line2 = address_line2;
    address.city = city;
    address.state = state;
    address.postal_code = postal_code;
    address.country = country;
    address.is_default = updatedDefault;

    await address.save();

    await handleDefaultAddress(req.user.id, address.id, updatedDefault);

    return res.json(address);
  } catch (err) {
    console.error('Update address error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /addresses/:id - Delete a saved address
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const wasDefault = address.is_default;
    await address.destroy();

    // If we deleted the default address, make another address default (if any exist)
    if (wasDefault) {
      const nextAddress = await Address.findOne({
        where: { user_id: req.user.id },
        order: [['createdAt', 'DESC']]
      });
      if (nextAddress) {
        nextAddress.is_default = true;
        await nextAddress.save();
      }
    }

    return res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete address error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
