
import Draft from '../models/Draft.js';

export const getDrafts = async (req, res) => {
  try {
    const { module, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (module) query.module = module;
    if (status) query.status = status;

    const [drafts, total] = await Promise.all([
      Draft.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Draft.countDocuments(query),
    ]);

    res.json({
      data: drafts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDraftById = async (req, res) => {
  try {
    const draft = await Draft.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDraft = async (req, res) => {
  try {
    const { module, data } = req.body;

    const draft = new Draft({
      module,
      data,
      status: 'draft',
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    await draft.save();

    res.status(201).json(draft);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDraft = async (req, res) => {
  try {
    const draft = await Draft.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user?._id || null,
    };

    const updatedDraft = await Draft.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedDraft);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const draft = await Draft.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    await draft.deleteOne();

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitDraft = async (req, res) => {
  try {
    const draft = await Draft.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    draft.status = 'submitted';
    draft.updatedBy = req.user?._id || null;
    await draft.save();

    res.json({ 
      message: 'Draft submitted successfully',
      draft,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};