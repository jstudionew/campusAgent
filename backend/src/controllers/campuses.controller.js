import * as campusSvc from '../services/campuses.service.js';
import cloudinary from '../config/cloudinary.js';

const resolveLogoUrl = async (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string') throw Object.assign(new Error('Campus logo must be an image URL or upload'), { status: 400 });
    if (!value.startsWith('data:')) {
        let url;
        try { url = new URL(value); } catch { throw Object.assign(new Error('Campus logo URL is invalid'), { status: 400 }); }
        if (url.protocol !== 'https:') throw Object.assign(new Error('Campus logo URL must use HTTPS'), { status: 400 });
        return value;
    }

    const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match) throw Object.assign(new Error('Use a PNG, JPEG, or WebP campus logo'), { status: 400 });
    if (Buffer.byteLength(match[2], 'base64') > 5 * 1024 * 1024) {
        throw Object.assign(new Error('Campus logo must be 5 MB or smaller'), { status: 413 });
    }

    const upload = await cloudinary.uploader.upload(value, {
        folder: 'campus-logos',
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    });
    return upload.secure_url;
};

export const list = async (req, res, next) => {
    try {
        if (req.user?.role === 'admin') {
            const campusId = req.user?.campusId;
            if (!campusId) return res.json({ rows: [], total: 0, page: 1, pageSize: 50 });
            const campus = await campusSvc.getById(campusId);
            return res.json({ rows: campus ? [campus] : [], total: campus ? 1 : 0, page: 1, pageSize: 50 });
        }
        const { page, pageSize, q } = req.query;
        const result = await campusSvc.list({
            page: Number(page) || 1,
            pageSize: Number(pageSize) || 50,
            q
        });
        return res.json(result);
    } catch (e) { next(e); }
};

export const getById = async (req, res, next) => {
    try {
        if (req.user?.role === 'admin') {
            const campusId = req.user?.campusId;
            if (!campusId || Number(req.params.id) !== Number(campusId)) {
                return res.status(404).json({ message: 'Campus not found' });
            }
        }
        const campus = await campusSvc.getById(req.params.id);
        if (!campus) return res.status(404).json({ message: 'Campus not found' });
        return res.json(campus);
    } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
    try {
        if (req.user?.role === 'admin') return res.status(403).json({ message: 'Forbidden' });
        const { name, address, phone, email, capacity, status, logoUrl } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        const campus = await campusSvc.create({
            name,
            address,
            phone,
            email,
            capacity: capacity === '' || capacity === undefined ? null : Number(capacity),
            status,
            logoUrl: await resolveLogoUrl(logoUrl)
        });
        return res.status(201).json(campus);
    } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
    try {
        if (req.user?.role === 'admin') return res.status(403).json({ message: 'Forbidden' });
        const { name, address, phone, email, capacity, status, logoUrl } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        const campus = await campusSvc.update(req.params.id, {
            name,
            address,
            phone,
            email,
            capacity: capacity === '' || capacity === undefined ? null : Number(capacity),
            status,
            logoUrl: await resolveLogoUrl(logoUrl)
        });
        if (!campus) return res.status(404).json({ message: 'Campus not found' });
        return res.json(campus);
    } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
    try {
        if (req.user?.role === 'admin') return res.status(403).json({ message: 'Forbidden' });
        const deleted = await campusSvc.remove(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Campus not found' });
        return res.json({ message: 'Campus deleted successfully' });
    } catch (e) { next(e); }
};
