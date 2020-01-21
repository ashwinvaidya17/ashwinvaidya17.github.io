---
title: AutoEmailer
categories: other projects
tags: [python, email, smtp]
permalink: "/blog/AutoEmailer"
date: '2019-08-05T18:18:00+05:30'
author: Ashwin Vaidya
layout: post
image: 
---
//add mcug badge to the photo

In college I was part of an organization called MIT Computer Users Group (MCUG). The group conducted activities such as teaching Linux. At that time we also published a quarterly newsletter explaining the latest in technology. We only made two physical copies while distributed it in digital format to the rest. Our mailing list consisted of 200+ teachers and included group emails of our alumni. We didn't use any mailing service and kept the email ids in a text file. When the time came to send the emails, we would split the list between each member and manually send the maild with the attachment individually. The challenge increased as we had to address the mail properly - "Dear Sir", "Dear Ma'am", "Greeting Students". As you can see this process was very tedious and time consuming. After being fed-up with doing this each time we released an issue, I decided to write some script to automate this process. After all, I was pursuing computer engineering anyways.

At that time I had no knowledge of python programming. I have seen that the best way to learn a programming language or a framework is by using it for a project. This way I don't end up parroting the tutorial and have a project that is useful to me. So, I decided that a script to automate the process of sending the emails was a good way to learn python and solve my problem.

The first thing I needed to do was to break down the task.
1. The first thing I needed was a way to send emails using Python.
2. I need a way to read the email list and sort it according to male teachers, female teachers and students.
3. I needed to figure out how to attach pdf file to the mail.

After searching a bit on Google, I found out about a library in python called ```smtp```.
//todo

For the second part, I decided to just manually sort the list into three (one for each category) and just read from each file seperatly.
```python
with open("student_emails.txt") as file:
    student_emails_array = [i.strip() for i in file]
with open("mteachers_emails.txt") as file:
    mteachers_emails_array = [i.strip() for i in file]
with open("fteachers_emails.txt") as file:
    fteachers_emails_array = [i.strip() for i in file]
```
After, a bit of lazy programming, I now had three body content with almost the same text.
```python
bodyStudent =  "Hello, \nWe are pleased to bring you the June’17 edition of MCUG Newsletter.\nHope you like it! Your valuable suggestions will help us in improving future editions .\nPFA\n\nRegards,\nMCUG Newsletter Team."
bodyMTeachers = "Dear Sir,\nWe are pleased ...
bodyFTeachers = "Dear Ma'am,\nWe are pleased ...
``` 

You can grab the entire code [here](https://github.com/ashwinvaidya17/AutoEmailer).

Thanks for reading 😎