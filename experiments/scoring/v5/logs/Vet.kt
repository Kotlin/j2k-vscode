
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.vet

import java.util.Comparator
import java.util.HashSet
import java.util.Set

import org.springframework.samples.petclinic.model.NamedEntity
import org.springframework.samples.petclinic.model.Person

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table
import jakarta.xml.bind.annotation.XmlElement

@Entity
@Table(name = "vets")
open class Vet : Person() {

    @field:ManyToMany(fetch = FetchType.EAGER)
    @field:JoinTable(
        name = "vet_specialties",
        joinColumns = [JoinColumn(name = "vet_id")],
        inverseJoinColumns = [JoinColumn(name = "specialty_id")]
    )
    private var specialties: MutableSet<Specialty>? = null

    protected val specialtiesInternal: MutableSet<Specialty>
        get() {
            if (specialties == null) {
                specialties = mutableSetOf()
            }
            return specialties!!
        }

    @get:XmlElement
    val specialties: List<Specialty>
        get() = specialtiesInternal.sortedBy { (it as NamedEntity).name }

    fun getNrOfSpecialties(): Int = specialtiesInternal.size

    fun addSpecialty(specialty: Specialty) {
        specialtiesInternal.add(specialty)
    }
}
