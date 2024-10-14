import { nanoid } from "nanoid";
import { generateUploadURL } from "../aws/index.js";
import { Blog } from "../models/blog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getUploadUrlForTitleImage = asyncHandler(async (req, res) => {
    generateUploadURL()
        .then(url => res.status(200).json({ uploadURL: url }))
        .catch(err => {
            console.log(err.message);
            return res.status(500).json({ error: err.message })
        })
})


const createBlog = asyncHandler(async (req, res) => {
    let authorId = req.user._id;
    console.log(authorId)

    let { title, des, banner, tags, content, draft } = req.body;


    if (!title.length) {
        return res.status(403).json({ error: "You must provide a Title" });
    }

    if(!draft){
        if (!des.length || des.length > 200) {
            return res.status(403).json({ error: "You must provide a blog description under 200 characters" });
        }
    
    
        if (!banner.length) {
            return res.status(403).json({ error: "You must provide a blog banner to publish it" });
        }
    
    
        if (!content.blocks.length) {
            return res.status(403).json({ error: "There must be some blog content to publish it." });
        }
    
    
        if (!tags.length || tags.length > 10) {
            return res.status(403).json({ error: "Provide tags in order to publish the blog, Maximum 10." });
        }
    
    
        tags = tags.map((tag) => tag.toLowerCase());
    }

   




    let blog_id = title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, "-").trim() + nanoid();


    // console.log(req.body)
    // console.log(req.user)
    console.log(req.user._id)
    // return res.json({ ...req.body, ...req.user });

    let blog = new Blog({
        title,
        des,
        banner,
        content,
        tags,
        author: authorId,
        blog_id,
        draft: Boolean(draft)
    })

    blog.save().then(blog => {
        let incrementVal = draft ? 0 : 1;

        User.findOneAndUpdate({ _id: authorId }, { $inc: { "account_info.total_posts": incrementVal }, $push: { "blogs": blog._id } })
            .then(user => {
                return res.status(200).json({ id: blog.blog_id})
            })
            .catch(err => {
                return res.status(500).json({ error: "Failed to update total posts number" })
            })
    })
        .catch(err => {
            return res.status(500).json({ error: err.message })
        })
    // return res.json({ ...req.body });

});

export {
    getUploadUrlForTitleImage,
    createBlog
}