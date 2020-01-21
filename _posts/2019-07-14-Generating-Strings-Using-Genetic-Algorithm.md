---
title: Generating Strings Using Genetic Algorithm
categories: machine learning
tags:
- python
- genetic algorithm
permalink: "/blog/Generating-Strings-Using-Genetic-Algorithm"
date: '2019-07-14 13:58:44'
author: Ashwin Vaidya
layout: post
image: stringCrossover.png
---

# Generating Strings Using Genetic Algorithm

We have always looked at nature and tried to understand its processes. Understanding the movement of planets and stars gave us the theory of gravity. It enabled us to send humans to Moon and soon will help us reach Mars.

Even with all our understanding of various physical processes, nature has still managed to keep one of the greatest mystery to itself - one of intelligence.

Humans have tried modelling intelligence using various approaches. The current models are based on the connectionist idea. The idea that modelling the connections in the brain is the path to intelligence. Earlier approaches were driven by the idea that given a lot of data and solid rules, the system would behave intelligently. These were called expert systems.

> If you want to read more about the connectionist approach here is the [introduction](https://ashwinvaidya.com/blog/a-very-basic-introduction-to-artificial-neural-network/) and [implementation](https://ashwinvaidya.com/blog/creating-neural-network-from-scratch-in-python/).

In this post, I am going to explain the algorithm which is responsible for the diversity of this planet - Genetic Algorithm

This algorithm can also lead to intelligent behaviour. The first time I saw this video
<iframe src="https://www.youtube.com/embed/bBt0imn77Zg" frameborder="0" allowfullscreen></iframe>
I was amazed by how close the behaviour is to real organisms. Further, this algorithm was also used in my [autonomous car](https://ashwinvaidya.com/blog/self-driving-car-using-genetic-algorithm-in-unity/) project.

## What is Genetic Algorithm?

Let's talk about biology first.

The sexual mode of reproduction largely contributes to the diversity of species and within species. A male and a female of the same species produce an offspring. The offspring inherits traits from both the parents. It gets half of its genes from its mother and half from its father. These genes dictate what feature the offspring will have. An offspring may inherit blue eyes from its mother and dark hair from its father.

![](/img/geneticTransfer.png)

However, there is never a perfect copy of a gene. Some errors creep in. Theses are called mutations.

![](/img/mutation.png)

A mutation might help the offspring weather heat than its parents or peers. This process over thousands of individuals leads to the diversity and survivability of the species. 

## Creating a Genetic Program

Now that we have made our excursions into biology lets come back to programming. I won't be focusing on applying genetic algorithm to intelligence in this post but will teach you the nuts and bolts of it. In the end, you will learn to use it for your projects too.

## Generating Strings

For the explanation we will generate a target string using the genetic algorithm.

Consider the target string: _Hustle Life._

We start by generating a random population of strings with the same length as the target string.

Here are three examples of the first generation:

```
J.Ktr TeRf.q
.Y wlei P eZ
nuRR .. Oxic
```

Now, for each member of the population, we calculate the fitness.

Fitness for this example is defined as the number of characters in the correct place.

For the first string above, characters t and f are in the same position as the target string. So, the fitness of the first string becomes 2.

Similarly, for the second and third-string, the fitness is 3 and 1 respectively.

Now that we have calculated fitness for each member of the population, we now create a mating pool. A mating pool is a list of members of the population is proportional to their fitness. The member with the higher fitness is present in greater number in the mating pool. The idea is that member with the higher fitness has a higher probability of selection as a parent than the member with lower fitness. 

```
matingPool = []
for each member in the population:
    fitness = fitness of the member/maxFitness
    n = math.floor(fitness * 100)
    for i from 1 to n:
        matingPool.append(member)
```

A small example of the mating pool is

![](/img/matingPool.png)

[Parent A, Parent A, Parent A, Parent B, Parent B, Parent C]

Here Parent A has the highest fitness and Parent C has the lowest.

_A quick in the example and the math in the pseudo-code above:
In the example, Parent A has max count 3. However, the parent with the highest fitness will have a count of 100 in our mating pool. This is because the fitness of the member equals max fitness and hence the ratio will be 1. Since it is then multiplied by 100, the value of n will be 100._

### Second Generation

The second generation is created from the mating pool.

First two parents are selected from the mating pool. Then, a child is created by combining genes from both the parents. The term for this combination is called crossover. The genes of this child are mutated. This child now becomes a member of the second generation population.

The process of selecting two parents and then crossover and mutation is repeated to create each member of the second generation. This generation will also have the population count of the first generation.

```
for i from 1 to length of population:
    parentA = randomChoice(matingPool)
    parentB = randomChoice(matingPool)
    child = crossover parentA and parentB
    mutate child
    add child to next population
```

In case of strings we do the crossover as follows:

```
midpoint = calculate a random number from 1 to length of the target string
child = parentA[0:mid point] + parentB[midpoint: length of string]
```

![](/img/stringCrossover.png)

To mutate the string we need a mutation rate. Suppose the mutation rate is 0.01.

```
for each character in child string:
    n = random number from 0 to 1
    if n < 0.01 (mutation rate):
        character = random character
```

That is it! Running this simple algorithm for a few generations gives us our target string.

You can find the Python code [here](https://github.com/ashwinvaidya17/GeneticAlgorithm-Strings).

Thanks for reading 😎