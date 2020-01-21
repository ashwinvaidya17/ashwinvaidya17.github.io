---
id: 79
title: What is Machine Learning?
date: 2018-09-16T09:25:14+05:30
author: Ashwin Vaidya
layout: post
guid: http://ashwinvaidya.com/?p=79
permalink: /blog/what-is-machine-learning/
image: /wp-content/uploads/2018/09/franck-v-516603-unsplash.jpg
categories:
  - machine learning
tags:
  - ai
  - ml
---
![](/img/wp-content/uploads/2018/09/franck-v-516603-unsplash.jpg)

<p style="text-align:center">
  Photo by Franck V. on Unsplash
</p>

# What is Machine Learning?

You and your friends are planning a mountaineering adventure. However, you do not have the heavy duty jacket to keep you warm. You log into a shopping site with a single day shipping promise. However, while you are shopping for the jacket, you see a beautiful sleeping bag and an ice axe. For a few bucks more you decide to add them to your cart. A few hours later your jacket arrives along with the sleeping bag, the ice axe, a fancy thermos, pair of shades, boots, gloves, waterproof trousers and other goods that you didn&#8217;t intend on originally plan on buying but ended up buying them.

What happened here? Does the algorithm know you are going on the trip? The answer is probably no. The shopping site recommended you goods that go along with your purchase. You felt they would be necessary for the trip and you ended up buying them. But consider the algorithm running on the site that is recommending you the items. The shopping site is showing you recommendations based on an algorithm. This algorithm recommends purchases based on your shopping history, the data from users who have similar taste as yours, similar shopping histories and have bought other items along with the item you are buying. However, this recommendation logic is not explicitly programmed into the recommendation engine. This is where Machine Learning comes in.

Before I explain what machine learning is, I will write a definition and then proceed to explain what it means.

> Machine Learning is the field of study that gives computers ability to learn without being explicitly programmed. - _Author Samuel_

Now consider this, you are the programmer who has to create the recommendation engine. You have access to all the past 5 years of the purchase history of every user on your site. It is not possible for you to go through every transaction and see if a pattern emerges. Further, if a new product is launched, you will have to change the logic again. So, you decide to let the computer figure it out.

## Supervised Learning

In order to build the recommendation engine, you will have to select an algorithm that takes in the current purchase and recommends other products. For a very simple machine learning model you would train it using the users' purchases acting as the inputs and items bought along with it as the outputs. Here, both input and output is provided during training and the algorithm learns to predict recommendations.

The above example is essentially what Supervised Learning is. Various machine learning models can be used for _supervised learning_ tasks such as [Decision Tree](https://ashwinvaidya.com/blog/posts/decision-tree), Neural Network and [Linear Regression](https://ashwinvaidya.com/blog/posts/linear-regression).

## Unsupervised Learning

There is another class of machine learning algorithms known as Unsupervised Learning algorithms. Here no labels are provided with the data. That is, there is no pre existing idea of what is to be found from the data. In the above example, finding the recommendations was the goal of the recommendation system. If however, the same shopping site wanted to find if there are some hidden patterns in the purchases by the users then _unsupervised learning_ algorithms come into the picture. Algorithms such as [K-Means Clustering](https://ashwinvaidya.com/blog/posts/k-meansclustering) and Neural Networks are suited for this job. On running such an algorithm on the transaction data, you might find that those who bought more than 10 books also bought a bookshelf. This way, the model learns the pattern between the users' purchases and recommends items without explicit representation. This is a simple example but it shows how _unsupervised learning_ algorithms can help in cross-selling.

_Just a recap._ Machine Learning is a field of study that gives the ability to computers to learn without being explicitly programmed. It is further divided into Supervised Learning and Unsupervised Learning.

Reinforcement Learning is also a part of Machine Learning but I will cover it in another post.

**You have reached the end 😎 .** Let me know what you feel about this post in the comments below.