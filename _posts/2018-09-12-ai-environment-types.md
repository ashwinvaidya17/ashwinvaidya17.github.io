---
id: 77
title: AI Environment Types
date: 2018-09-12T09:23:36+05:30
author: Ashwin Vaidya
layout: post
guid: http://ashwinvaidya.com/?p=77
permalink: /blog/ai-environment-types/
image: /wp-content/uploads/2018/09/rawpixel-558598-unsplash.jpg
categories:
  - machine learning
tags:
  - ai
  - ml
---
<figure class="wp-block-image"><img src="http://ashwinvaidya.com/wp-content/uploads/2018/09/rawpixel-558598-unsplash.jpg" alt="" class="wp-image-42" srcset="https://ashwinvaidya.com/wp-content/uploads/2018/09/rawpixel-558598-unsplash.jpg 6628w, https://ashwinvaidya.com/wp-content/uploads/2018/09/rawpixel-558598-unsplash-300x175.jpg 300w, https://ashwinvaidya.com/wp-content/uploads/2018/09/rawpixel-558598-unsplash-768x449.jpg 768w, https://ashwinvaidya.com/wp-content/uploads/2018/09/rawpixel-558598-unsplash-1024x598.jpg 1024w" sizes="(max-width: 6628px) 100vw, 6628px" /></figure> 

<p style="text-align:center">
  Photo by rawpixel on Unsplash
</p>

An AI agent operates in an _environment_. For example, for a self-driving car, the environment is the road and for a chess-playing agent, the environment is the chessboard. Further, an environment might also have other agents operating on it. Like other autonomous vehicles in the example of the self-driving car. The nature of _environment_ also varies based on the problem that the AI agent is intended to solve.

The [previous](https://ashwinvaidya.com/blog/posts/what-is-artificial-intelligence) blog post covered the definition of an artificial intelligence agent. In this post, I am going to explain in brief the classification of _environments_.

## 1. Fully Observable vs. Partially Observable

Consider the example of Chess where each player has access to the complete board information. Every decision is made considering the state of the board at that time and the possible moves by the other player. This is a &#8216;fully observable&#8217; environment. Contrast this with Poker where players cannot anticipate the opponent&#8217;s game as they do not have access to the opponent&#8217;s cards. Such an environment is &#8216;Partially Observable&#8217;. 

The environment of an autonomous vehicle is Partially Observable since the car cannot predict what the other cars might do.

## 2. Deterministic vs. Stochastic

In a Deterministic environment, the outcome is certain and can be determined based on a specific state. However, in a Stochastic environment, the next state cannot be predicted with certainty. Chess can be considered as having a Deterministic environment. The autonomous vehicle, however, has a Stochastic environment. Here, the decision taken by the autonomous vehicle is based on the probability of action of other vehicles.

## 3. Competitive vs. Collaborative

In Competitive environments, AI agents face other AI agents. Two AI agents playing chess against each other is an example of a Competitive environment. In Collaborative environments, AI agents work with each other to achieve a specific objective. Self-driving vehicles can be said to operate in a Collaborative environment as they coordinate their actions to avoid collisions.

## 4. Static vs. Dynamic

A Dynamic environment might change while the agent is processing a response. However, in a Static environment, the environment does not change during the course of decision making. An autonomous car has to deal with a Dynamic environment whereas, in Chess, the environment remains unchanged (Static) during the period a player is a contemplation the next move.

## 5. Episodic vs. Sequential

In a Sequential environment, the agent has to take decisions considering its previous decisions. However, in an Episodic environment, the agent has to consider only the current state of the environment.

**You have reached the end 😎.** Let me know what you feel about this post in the comments below.